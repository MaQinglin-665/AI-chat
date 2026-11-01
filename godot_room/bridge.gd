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
var pending := "entered"

func _ready():
	room = get_parent()
	player = room.get_node("Player")
	ai = room.get_node("Companion")
	player.spoke.connect(chat)
	player.interacted.connect(func(_id, act): event({"sit":"sat","stand_up":"stood","gave":"gave"}.get(act,"idle")))
	if not token.is_empty(): event("entered")

var needs := {"energy":.75,"boredom":.45,"curiosity":.68,"closeness":.35,"solitude":.30}
var receipts := []
var steps := []
var current := {}
var goal := {}
var last := {}
var activity := []
var last_move := 0.
var since_step := 0.
var utility_clock := 15.
var source := ""
var observed_position := Vector3.ZERO
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
		if gap<distance:
			distance=gap
			nearest=id
	return nearest

func status_value():
	return {"event":"idle","user":vec(player.position),"ai":vec(ai.position),"objects":room.objects.keys(),
		"user_state":"sit" if player.seated else "typing" if player.entry.visible else "walk" if player.velocity.length()>.15 else "stand",
		"ai_state":ai.own_state,"needs":needs.duplicate(),"last_move_sec":int(last_move),
		"ai_near":nearest_landmark(ai.position),"user_near":nearest_landmark(player.position),"goal":goal.duplicate(),"last":last.duplicate(),"activity":activity.slice(-3),"receipts":receipts.duplicate(true)}

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
	if current.action=="sit_on" and target=="chair" and player.seated and player.position.distance_to(room.objects.chair.position)<1.:
		finish("failed","occupied")
		return
	execute(current)

func accept(plan, owner):
	goal_id+=1
	source=owner
	steps=[plan.action]+plan.get("goal",[])
	var end=steps.back()
	goal={"action":end.action,"target":end.get("target",""),"status":"accepted","steps":steps.duplicate(true)}
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
	var near_now=ai.position.distance_to(player.position)<2.
	if nearby!=near_now:
		nearby=near_now
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
	if chatting or player.entry.visible or not current.is_empty(): return
	if not token.is_empty() and not thinking and (pending!="" or countdown<=0):
		think()
	elif utility_clock<=0 and not thinking:
		utility_clock=randf_range(14,35)
		var small={"action":"look_at","target":["shelf","window"].pick_random()}
		if ai.sitting and needs.boredom>.55: small={"action":"stand_up"}
		elif ai.sitting and randf()<.5:
			ai.body.rotation.y+=randf_range(-.12,.12)
		elif not nearby and needs.closeness>.55 and randf()<needs.closeness: small={"action":"approach_user"}
		accept({"action":small},"utility")

func vec(v):
	return [snappedf(v.x,.25),snappedf(v.y,.25),snappedf(v.z,.25)]

func request(route: String, payload: Dictionary):
	var http := HTTPRequest.new()
	add_child(http)
	http.timeout = 100. if route == "chat" else 20.
	var begin = Time.get_ticks_msec()
	var error = http.request("http://127.0.0.1:%d/api/%s" % [port,route],
		["Authorization: Bearer "+token,"Content-Type: application/json","Origin: http://127.0.0.1:%d"%port],
		HTTPClient.METHOD_POST,JSON.stringify(payload))
	if error != OK:
		http.queue_free()
		return {}
	var response = await http.request_completed
	http.queue_free()
	print("room_http ",route," ",response[1]," ms=",Time.get_ticks_msec()-begin)
	if response[1] != 200: return {}
	var data = JSON.parse_string(response[3].get_string_from_utf8())
	return data if data is Dictionary else {}

func think(message := ""):
	thinking=true
	var serial=generation
	var data=status_value()
	data.event="spoke" if message else pending if pending else "idle"
	data.message=message
	pending=""
	var changes={}
	for key in data:
		if key not in ["event","message"] and (version==0 or data[key]!=previous.get(key)): changes[key]=data[key]
	var receipt_count=receipts.size()
	var result=await request("room/intent",{"session":session,"base":version,"changes":changes,"event":data.event,"message":message})
	version=int(result.get("version",0))
	previous=data.duplicate(true)
	if version>0: receipts=receipts.slice(receipt_count)
	thinking=false
	countdown=randf_range(20,55)
	if serial!=generation: return
	if not result.has("intent"):
		if message: goal={"status":"failed","reason":"unavailable"}
		return
	var decision=result.intent
	accept(decision,"user" if message else "autonomous")
	if not message and decision.get("say",""): ai.speak(decision.say,"neutral")

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
	event("spoke")
	chatting = true
	while thinking: await get_tree().process_frame
	await think(message)
	var data = await request("chat",{"message":message,"history":history,"room":status_value()})
	chatting = false
	var reply = str(data.get("reply",""))
	print("CHAT_GROUND ",goal_id," ",goal.status if goal.has("status") else "none"," reply_chars=",reply.length())
	if reply:
		ai.speak(reply,"neutral")
		history.append({"role":"user","content":message})
		history.append({"role":"assistant","content":reply})
		history = history.slice(-6)
