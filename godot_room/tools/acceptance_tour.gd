extends SceneTree
# Timed user-side inputs only. Companion decisions come from the normal bridge.
var room
var p
var ai
var started := 0
var tick := -1
var last := -1
var sent := {}
func _initialize(): setup.call_deferred()
func setup():
	root.size = Vector2i(960,540)
	room = load("res://room.tscn").instantiate()
	root.add_child(room)
	p = room.get_node("Player")
	ai = room.get_node("Companion")
	Engine.max_fps = 60
	started = Time.get_ticks_msec()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
func once(id):
	if sent.has(id): return false
	sent[id] = true
	return true
func press(key):
	var e := InputEventKey.new()
	e.keycode=key
	e.pressed=true
	p._unhandled_input(e)
func face(pos):
	var d: Vector3 = pos-p.camera.global_position
	p.rotation.y=atan2(-d.x,-d.z)
	p.aim.rotation.x=asin(clampf(d.normalized().y,-1.2,1.2))
func _physics_process(dt):
	if not p: return false
	var t=(Time.get_ticks_msec()-started)/1000.
	var target = ai.position
	var margin = 1.5
	var moving = t>12 and t<50
	face(ai.position+Vector3.UP*1.4)
	if t>55 and once("type"):
		press(KEY_ENTER)
		p.entry.text="馨语，晚上好！这个房间里你最喜欢哪里？"
	if t>61 and once("send"): p.entry.text_submitted.emit(p.entry.text)
	if t>95 and t<190 and not p.seated:
		target = room.objects.sofa.position+Vector3.BACK*.98
		margin=.09
		face(room.objects.sofa.position)
		moving=true
		if p.focus==room.objects.sofa and t>105:
			press(KEY_E)
	if t>190:
		if p.seated: press(KEY_E)
		if once("third"): press(KEY_V)
		target=Vector3(2,0,2.6)
		margin=.15
		moving=true
	var gap:Vector3=(target-p.position).slide(Vector3.UP)
	if moving and not p.seated and gap.length()>margin:
		p.move_and_collide(gap.normalized()*dt*1.5)
	return false
func _process(_delta):
	if not p: return false
	var ms=Time.get_ticks_msec()-started
	if int(ms/125)>tick:
		tick=int(ms/125)
		root.get_texture().get_image().save_jpg(OS.get_environment("ROOM_FRAMES").path_join("%06d.jpg"%tick),.78)
	if int(ms/5000)>last:
		last=int(ms/5000)
		print("SAMPLE ",ms," ",Engine.get_frames_per_second()," ",p.seated," ",p.third_person," ",ai.own_state," ",p.position.distance_to(ai.position)," reply_chars=",ai.bubble.text.length())
	if ms>=300000: quit()
	return false
