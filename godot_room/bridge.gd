extends Node
var port := 18471
var token := OS.get_environment("TAFFY_API_TOKEN")
var history := []
var recent := []
var player
var ai
var room
var countdown := 1.
var nearby := false
var thinking := false
var chatting := false
var pending := "entered"
var epoch := 0

func _ready():
	room = get_parent()
	player = room.get_node("Player")
	ai = room.get_node("Companion")
	player.spoke.connect(chat)
	player.interacted.connect(func(_id, act): event({"sit":"sat","stand_up":"stood","pick_up":"gave"}.get(act,"idle")))
	if not token.is_empty(): event("entered")

func event(reason):
	pending = reason
	recent.append(reason)
	if recent.size() > 6: recent.pop_front()
	epoch += 1
	if reason in ["near","spoke"]:
		ai.look_target = player
		if not ai.follow and not ai.sitting:
			ai.own_state = "idle"
			ai.motion.playback.travel("Idle")

func _process(delta):
	var near_now = ai.global_position.distance_to(player.global_position) < 2.
	if nearby != near_now:
		nearby = near_now
		event("near" if nearby else "left")
	countdown -= delta
	if token.is_empty() or thinking or chatting or player.entry.visible: return
	if not pending.is_empty() or countdown <= 0: think()

func vec(v: Vector3):
	return [v.x,v.y,v.z]

func visible():
	var ids := []
	var start: Vector3 = ai.global_position + Vector3.UP*1.45
	for id in room.objects:
		var obj = room.objects[id]
		var ray := PhysicsRayQueryParameters3D.create(start,obj.global_position)
		ray.exclude = [ai.get_rid()]
		var hit := get_viewport().world_3d.direct_space_state.intersect_ray(ray)
		if hit.is_empty() or hit.collider == obj: ids.append(id)
	return ids

func request(route: String, payload: Dictionary):
	var http := HTTPRequest.new()
	add_child(http)
	http.timeout = 35.
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

func think():
	thinking = true
	var reason = pending if pending else "idle"
	pending = ""
	var serial = epoch
	var gaze = str(player.focus.name) if player.focus else ""
	var data = await request("room/intent",{"event":reason,"recent":recent,"objects":visible(),"history":history,
		"user":vec(player.position),"ai":vec(ai.position),"user_forward":vec(-player.basis.z),"ai_forward":vec(ai.body.basis.z),
		"gaze":"companion" if gaze == "Companion" else gaze,"user_state":"sit" if player.seated else "typing" if player.entry.visible else "walk" if player.velocity.length() > .15 else "stand","ai_state":ai.own_state})
	thinking = false
	countdown = randf_range(20,60)
	if serial == epoch and data.has("intent"): execute(data.intent)

func execute(intent):
	var target = intent.get("target","")
	var obj = room.objects.get(target) if target is String else null
	if target is String and target == "user": obj = player
	print("room_decision ",intent.action)
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
		"gesture": ai.motion.playback.travel("Interact")
		"say": ai.bubble.text = str(intent.text).left(100)

func chat(message):
	event("spoke")
	if chatting or token.is_empty(): return
	chatting = true
	var data = await request("chat",{"message":message,"history":history})
	chatting = false
	var reply = str(data.get("reply",""))
	if reply:
		ai.bubble.text = reply.left(100)
		history.append({"role":"user","content":message})
		history.append({"role":"assistant","content":reply})
		history = history.slice(-6)
