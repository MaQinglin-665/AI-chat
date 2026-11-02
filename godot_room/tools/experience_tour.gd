extends "res://tools/phase4_tour.gd"
# A repeatable coverage tour. Schedule activities explicitly; their navigation,
# poses and receipts use production logic. Dialogue uses the live backend.
func _physics_process(dt):
	if not p: return false
	var t=(Time.get_ticks_msec()-started)*.001
	var bridge=room.get_node("Bridge")
	if t<1.0: return false
	if t<12:
		if once("opening"):
			p.position=NavigationServer3D.map_get_closest_point(room.region.get_navigation_map(),ai.position+Vector3(.65,0,1.4))
		face(ai.position+Vector3.UP*1.44)
		if t>2 and once("call"): press(KEY_F)
		if t>5 and p.can_greet() and once("opening_five"):
			press(KEY_E)
			if p.choices.visible:
				p.choices.id_pressed.emit(1)
				p.choices.hide()
		return false
	if t<23:
		walk_to(room.approach_point(room.objects.book),dt)
		face(room.objects.book.global_position)
		if p.focus==room.objects.book and not p.held_book: press(KEY_E)
		return false
	if t>23 and once("call_again"): press(KEY_F)
	if t>19 and t<36: walk_to(ai.position+(p.position-ai.position).normalized()*1.4,dt)
	face(ai.position+Vector3.UP*(1.25 if ai.sitting else 1.42))
	if t>26 and t<36 and p.can_greet() and p.held_book: press(KEY_E)
	if t>34 and once("hello"): p.send_message("晚上好呀，见到你真好。")
	if t>48 and once("read"): schedule(bridge,"read")
	if t>72 and once("tidy"): schedule(bridge,"tidy")
	if t>94 and once("stretch"): schedule(bridge,"stretch")
	if t>106 and once("yawn"): schedule(bridge,"yawn")
	if t>117 and once("nap"):
		bridge.needs.energy=.16
		schedule(bridge,"nap")
	if t>131 and t<148: walk_to(ai.position+(p.position-ai.position).normalized()*1.35,dt)
	if t>151 and once("rest"): p.send_message("休息得怎么样？")
	if t>166 and once("again"): press(KEY_F)
	if t>170 and t<202: walk_to(ai.position+(p.position-ai.position).normalized()*1.35,dt)
	if t>174 and t<179 and p.held_book and p.can_greet(): press(KEY_E)
	if t>179 and t<197 and p.can_greet() and not p.held_book and once("pat"):
		press(KEY_E)
		if p.choices.visible:
			p.choices.id_pressed.emit(0)
			p.choices.hide()
	if t>188 and t<201 and p.can_greet() and once("five"):
		press(KEY_E)
		if p.choices.visible:
			p.choices.id_pressed.emit(1)
			p.choices.hide()
	if t>195 and t<201 and not p.held_book: bridge.offer_to_user()
	if t>205 and once("window_idle"): schedule(bridge,"window_idle")
	if t>218 and t<248: walk_to(room.approach_point(room.objects.window),dt)
	if t>246 and once("window"): schedule(bridge,"shared_window")
	if t>266 and once("sky"): p.send_message("你觉得今晚的窗外怎么样？")
	if t>288 and once("bye"): p.send_message("今天谢谢你陪我。")
	return false

func schedule(bridge,kind):
	if not bridge.current.is_empty(): bridge.finish("interrupted","tour_transition")
	bridge.start_activity(kind)
