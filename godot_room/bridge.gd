extends Node
var port := int(OS.get_environment("XINYU_ROOM_PORT")) if OS.has_environment("XINYU_ROOM_PORT") else 18471
var token := OS.get_environment("TAFFY_API_TOKEN")
var history := []
var player
var ai
var room
var countdown := 1.
var nearby := false
var thinking := false
var chatting := false
var connecting := false
var pending := "entered"

func _ready():
	room = get_parent()
	player = room.get_node("Player")
	ai = room.get_node("Companion")
	previous_user = player.global_position
	observed_position = ai.global_position
	player.spoke.connect(chat)
	player.interacted.connect(func(_id, act): event({"sit":"sat","stand_up":"stood","gave":"gave"}.get(act,"idle")))
	if OS.has_environment("XINYU_ROOM_TICKET"):
		connecting=true
		token=OS.get_environment("XINYU_ROOM_TICKET")
		var session_info=await request("room/session",{})
		token=str(session_info.get("token",""))
		history=session_info.get("history",[])
		connecting=false
		if token.is_empty():
			get_tree().quit(2)
			return
		watch_parent()
	if not token.is_empty(): event("entered")

func watch_parent():
	var failures=0
	while is_inside_tree():
		await get_tree().create_timer(5.).timeout
		if not is_inside_tree(): return
		var result=await request("room/alive",{})
		failures=0 if result.get("ok") else failures+1
		if failures>=2:
			get_tree().quit()
			return

var needs := {"energy":.75,"boredom":.45,"curiosity":.68,"closeness":.35,"solitude":.30}
var receipts := []
var steps := []
var current := {}
var goal := {}
var last := {}
var activity := []
var visits := {}
var speech_balance := 0
const FOLLOW_TRIGGER_DISTANCE := 3.2
const REVISIT_COOLDOWN := 60.

func recent_destinations():
	var recent := []
	for id in visits:
		if Time.get_ticks_msec() * .001 - visits[id] < REVISIT_COOLDOWN:
			recent.append(id)
	return recent

func capabilities():
	var caps := {}
	for id in room.markers:
		caps[id] = room.markers[id].get_meta("affordances")
	return caps

var last_move := 0.
var since_step := 0.
var utility_clock := 15.
var source := ""
var observed_position := Vector3.ZERO
var previous_user := Vector3.ZERO
var goal_id := 0
var generation := 0
var session := str(Time.get_unix_time_from_system())
var version := 0
var previous := {}

func nearest_landmark(pos: Vector3):
	var nearest=""
	var distance=2.5
	for id in room.objects:
		var gap=(room.objects[id].position-pos).slide(Vector3.UP).length()
		if id=="rug": continue
		if gap<distance:
			distance=gap
			nearest=id
	return nearest

func status_value():
	return {"period":room.period,"event":"idle","user":vec(player.position),"ai":vec(ai.position),"objects":capabilities(),"recent_destinations":recent_destinations(),"speech_balance":speech_balance,
		"user_state":"sit" if player.seated else "typing" if player.entry.visible else "walk" if player.velocity.length()>.15 else "stand",
		"ai_state":ai.own_state,"needs":needs.duplicate(),"last_move_sec":int(last_move),
		"ai_near":str(ai.seat_object.name) if ai.sitting and ai.seat_object else nearest_landmark(ai.position),"user_near":str(player.seat_object.name) if player.seated and player.seat_object else nearest_landmark(player.position),"goal":goal.duplicate(),"last":last.duplicate(),"activity":activity.slice(-3),"receipts":receipts.duplicate(true)}

func event(reason):
	pending = reason
	if reason in ["near","spoke","entered"]:
		ai.look_target=player
		ai.gaze.play("nod")
	if reason == "left": needs.closeness=minf(1.,needs.closeness+.28)
	if reason == "spoke":
		generation+=1
		if not current.is_empty(): finish("interrupted","input")

func ack(status, why):
	last={"action":current.action,"target":current.get("target",""),"status":status,"reason":why}
	if status!="running":
		receipts.append(last.duplicate())
		receipts=receipts.slice(-16)
	activity.append(last.duplicate())
	activity=activity.slice(-6)
	print("ACK ",goal_id," ",source," ",JSON.stringify(last))

func finish(status,why):
	ack(status,why)
	goal.status=status
	goal.reason=why
	if source=="user" and status=="completed" and OS.has_environment("XINYU_ROOM_TICKET"):
		request("room/receipt",{"steps":goal.steps,"user_state":"sit" if player.seated else "stand"})
	steps.clear()
	current={}
	ai.follow=false
	ai.sit_target=null
	if ai.own_state=="walking":
		ai.own_state="idle"
		ai.motion.playback.travel("Idle")
	print("GOAL ",goal_id," ",source," ",status," ",why)

func begin_step():
	current=steps.pop_front()
	since_step=0.
	goal.step=current.duplicate()
	goal.status="running"
	ack("running","")
	var target=current.get("target","")
	# Reaffirming the adjacent seat should never stand the companion up
	# to navigate back to the same cushion.
	if ai.sitting and (target==str(ai.seat_object.name) or (target=="user" and ai.seat_object==player.seat_object)):
		if current.action in ["go_to","sit_on"]:
			if steps.is_empty(): finish("completed","ok")
			else:
				ack("completed","ok")
				begin_step()
			return
	if current.action=="sit_on" and room.seat_for(room.objects.get(target),ai).is_empty():
		finish("failed","occupied")
		return
	execute(current)

func accept(plan, owner):
	goal_id+=1
	source=owner
	steps=[plan.action]+plan.get("goal",[])
	var end=steps.back()
	goal={"description":plan.get("description",""),"action":end.action,"target":end.get("target",""),"status":"accepted","steps":steps.duplicate(true)}
	print("ACCEPT ",goal_id," ",owner," ",JSON.stringify(steps)," needs=",JSON.stringify(needs)," say=",str(plan.get("say","")).length()," tick=",Time.get_ticks_msec()," reason=",str(plan.get("thought","")).left(60))
	begin_step()

func advance(delta):
	if current.is_empty(): return
	since_step+=delta
	var done=false
	match current.action:
		"go_to","approach_user","follow_user":
			var target=current.get("target","user")
			var where:Vector3
			if target is Array: where=Vector3(target[0],0,target[2])
			elif target=="user": where=player.position
			else: where=room.objects[target].position
			var gap=(ai.position-where).slide(Vector3.UP).length()
			if target=="user": done=gap<1.9
			else: done=ai.own_state!="walking" and (ai.position-ai.agent.target_position).slide(Vector3.UP).length()<.45
			if since_step>1. and ai.own_state!="walking" and not done:
				finish("failed","unreachable")
				return
		"sit_on": done=ai.sitting and ai.motion.playback.get_current_node()=="Sitting_Idle"
		"stand_up": done=not ai.sitting and ai.own_state=="idle"
		"idle": done=since_step>=current.get("seconds",3)
		_: done=since_step>1.2
	if done:
		if current.action in ["go_to","follow_user","approach_user"]:
			var id=current.get("target","user")
			if id is String: visits[id]=Time.get_ticks_msec()*.001
			ai.follow=false
			ai.own_state="idle"
			ai.motion.playback.travel("Idle")
			needs.boredom*=.4
			needs.curiosity*=.6
		if steps.is_empty(): finish("completed","ok")
		else:
			ack("completed","ok")
			begin_step()
	elif since_step>18.: finish("failed","unreachable")

func _process(delta):
	var distance=ai.position.distance_to(player.position)
	var near_now=distance<(2.6 if nearby else 1.8)
	var user_travel=(player.position-previous_user).slide(Vector3.UP)
	var user_radial=user_travel.dot((player.position-ai.position).slide(Vector3.UP).normalized())
	previous_user=player.position
	if nearby!=near_now:
		nearby=near_now
		if (nearby and user_radial<-.001) or (not nearby and user_radial>.001):
			event("near" if nearby else "left")
	var walking=ai.own_state=="walking"
	last_move=0. if (ai.position-observed_position).slide(Vector3.UP).length()>.001 else last_move+delta
	observed_position=ai.position
	needs.energy=clampf(needs.energy+delta*(.008 if ai.sitting else -.0015),0,1)
	needs.boredom=clampf(needs.boredom+delta*(-.018 if walking else .008 if ai.sitting else .005),0,1)
	needs.curiosity=clampf(needs.curiosity+delta*.002,0,1)
	needs.closeness=clampf(needs.closeness+delta*(-.006 if nearby else .002),0,1)
	needs.solitude=clampf(needs.solitude+delta*(.003 if nearby else -.003),0,1)
	advance(delta)
	countdown-=delta
	utility_clock-=delta
	if connecting or chatting or player.entry.visible or not current.is_empty(): return
	if not token.is_empty() and not thinking and (pending!="" or countdown<=0):
		think()
	elif utility_clock<=0 and not thinking:
		utility_clock=randf_range(14,35)
		var small={"action":"look_at","target":["shelf","window"].pick_random()}
		if ai.sitting and needs.boredom>.55: small={"action":"stand_up"}
		elif ai.sitting and randf()<.5:
			ai.body.rotation.y+=randf_range(-.12,.12)
		elif needs.closeness>.55 and randf()<needs.closeness:
			small={"action":"approach_user"} if distance>FOLLOW_TRIGGER_DISTANCE and "user" not in recent_destinations() else {"action":"look_at","target":"user"}
		elif not ai.sitting and randf()<needs.curiosity+needs.solitude:
			var choices = ["shelf","window","chair"].filter(func(id): return id not in recent_destinations() and (id!="chair" or player.seat_object!=room.objects.chair))
			if not choices.is_empty():
				var target=choices.pick_random()
				var next={"action":"sit_on" if target=="chair" else "look_at","target":target}
				accept({"action":{"action":"go_to","target":target},"goal":[next,{"action":"idle","seconds":8}]},"utility")
				return
		accept({"action":small},"utility")

func vec(v):
	return [snappedf(v.x,.25),snappedf(v.y,.25),snappedf(v.z,.25)]

func request(route: String, payload: Dictionary):
	var http := HTTPRequest.new()
	add_child(http)
	http.max_redirects=0
	http.timeout = 2. if route=="room/alive" else 20.
	var begin = Time.get_ticks_msec()
	var error = http.request("http://127.0.0.1:%d/api/%s" % [port,route],
		["Authorization: Bearer "+token,"Content-Type: application/json","Origin: http://127.0.0.1:%d"%port],
		HTTPClient.METHOD_POST,JSON.stringify(payload))
	if error != OK:
		http.queue_free()
		return {}
	var response = await http.request_completed
	http.queue_free()
	if route!="room/alive": print("room_http ",route," ",response[1]," ms=",Time.get_ticks_msec()-begin)
	if response[1] != 200: return {}
	var data = JSON.parse_string(response[3].get_string_from_utf8())
	return data if data is Dictionary else {}

func think():
	thinking=true
	var serial=generation
	var data=status_value()
	data.event=pending if pending else "idle"
	data.message=""
	pending=""
	var changes={}
	for key in data:
		if key not in ["event","message"] and (version==0 or data[key]!=previous.get(key)): changes[key]=data[key]
	var receipt_count=receipts.size()
	var result=await request("room/intent",{"session":session,"base":version,"changes":changes,"event":data.event,"message":""})
	version=int(result.get("version",0))
	previous=data.duplicate(true)
	if version>0: receipts=receipts.slice(receipt_count)
	thinking=false
	countdown=randf_range(20,55)
	if serial!=generation: return
	if not result.has("intent"): return
	var decision=result.intent
	if data.event=="entered" and not decision.get("say",""): decision.say="你来啦。"
	speech_balance=clampi(speech_balance+(-1 if not decision.get("say","") else 1),-5,5)
	accept(decision,"autonomous")
	if decision.get("say",""): ai.speak(decision.say,"neutral")

func execute(intent):
	var target = intent.get("target","")
	var obj = room.objects.get(target) if target is String else null
	if target is String and target == "user": obj = player
	print("room_decision ",intent.action," target=",str(intent.get("target","")))
	match intent.action:
		"follow_user","approach_user":
			ai.follow = intent.action == "follow_user"
			ai.approach(player)
		"stop_follow":
			ai.follow = false
			ai.own_state = "idle"
			ai.motion.playback.travel("Idle")
		"look_at":
			if obj: ai.look_target = obj
		"go_to","sit_on":
			ai.follow = false
			if obj:
				ai.sit_target = obj if intent.action == "sit_on" else null
				ai.approach(obj)
			elif target is Array and target.size() == 3:
				ai.agent.target_position = Vector3(target[0],0,target[2])
				ai.own_state = "walking"
		"stand_up": ai.stand()
		"gesture": ai.gaze.play(intent.name)
		"say": ai.speak(str(intent.text),str(intent.get("emotion","neutral")))

func chat(message):
	if chatting or token.is_empty(): return
	var user_started=Time.get_ticks_msec()
	event("spoke")
	# This event belongs to the combined turn. Do not also schedule an autonomous call for it.
	pending=""
	countdown=randf_range(20,55)
	chatting = true
	var result=await request("room/turn",{"message":message,"history":history,"world":status_value()})
	var reply=str(result.get("reply",""))
	if reply and result.get("action") is Dictionary:
		accept({"action":result.action,"goal":result.get("steps",[]),"description":result.get("goal","")},"user")
		ai.speak(reply,"neutral")
		history.append({"role":"user","content":message})
		history.append({"role":"assistant","content":reply})
		history = history.slice(-6)
	print("ROOM_TURN visible_ms=",Time.get_ticks_msec()-user_started," displayed=",not reply.is_empty())
	chatting=false
