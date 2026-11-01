extends SceneTree
# Timed user-side inputs only. Companion decisions come from the normal bridge.
var room
var capture := SubViewport.new()
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
	var preview := SubViewportContainer.new()
	root.add_child(preview)
	capture.size = Vector2i(960,540)
	preview.add_child(capture)
	capture.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	capture.add_child(room)
	p = room.get_node("Player")
	p.interacted.connect(func(id, act): print("USER_INTERACTION ",act," ",id," ms=",Time.get_ticks_msec()-started))
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
func walk_to(target,dt):
	var path = NavigationServer3D.map_get_path(room.region.get_navigation_map(),p.position,target,true)
	for point in path:
		var delta: Vector3=(point-p.position).slide(Vector3.UP)
		if delta.length()>.13:
			p.move_and_collide(delta.normalized()*minf(delta.length(),dt*1.8))
			break

func _physics_process(dt):
	if not p: return false
	var t=(Time.get_ticks_msec()-started)/1000.
	if t>2 and t<9: walk_to(Vector3(.2,0,1.4),dt)
	if t>82 and t<204 and not p.seated:
		var entry=room.approach_point(room.objects.sofa)
		walk_to(entry,dt)
		if (entry-p.position).slide(Vector3.UP).length()<.32: p.take_seat(room.objects.sofa)
	if t>101 and once("sofa"): p.send_message("过来坐我旁边")
	if t>118 and once("third"): press(KEY_V)
	if t>158 and once("window_view") and p.third_person: press(KEY_V)
	if t>165 and once("window"): p.send_message("去窗边看看外面")
	if t>204 and once("leave_sofa"):
		if p.seated: press(KEY_E)
		if p.third_person: press(KEY_V)
	if t>205 and t<265 and not p.seated:
		var entry=room.approach_point(room.objects.chair)
		walk_to(entry,dt)
		if (entry-p.position).slide(Vector3.UP).length()<.32:
			if not p.take_seat(room.objects.chair) and once("ask_for_chair"):
				p.send_message("我想坐在书桌前，请先起身，让我坐。")
	if t>266 and once("leave_desk"):
		if p.seated: press(KEY_E)
		if not p.third_person: press(KEY_V)
	if t>267: walk_to(Vector3(1.4,0,2.7),dt)
	if p.seated and p.seat_object==room.objects.sofa:
		# Orbit the seated user's eye, never rotate their body away from the Seat.
		if p.third_person:
			p.aim.rotation=Vector3(-.13,-2.8,0)
		elif ai.sitting:
			p.aim.rotation=Vector3(.06,1.32,0)
		else:
			var local_target=p.to_local(ai.position+Vector3.UP*1.35)-p.aim.position
			p.aim.rotation=Vector3(asin(clampf(local_target.normalized().y,-.3,.3)),atan2(-local_target.x,-local_target.z),0)
	elif not p.seated:
		p.aim.rotation.y=0
		face(ai.position+Vector3.UP*(1.32 if ai.sitting else 1.52))
	return false
func _process(_delta):
	if not p: return false
	var ms=Time.get_ticks_msec()-started
	if int(ms*30/1000.)>tick:
		tick=int(ms*30/1000.)
		RenderingServer.force_draw(false)
		capture.get_texture().get_image().save_jpg(OS.get_environment("ROOM_FRAMES").path_join("%06d.jpg"%tick),.78)
	if int(ms/5000)>last:
		last=int(ms/5000)
		print("SAMPLE ",ms," ",Engine.get_frames_per_second()," ",p.seated," ",p.third_person," ",ai.own_state," ",p.position.distance_to(ai.position)," reply_chars=",ai.bubble.text.length())
	if ms>=305000: quit()
	return false
