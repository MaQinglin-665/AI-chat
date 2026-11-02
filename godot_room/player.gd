extends CharacterBody3D

signal spoke(text: String)
signal interacted(object_id: String, action: String)
var aim := Node3D.new()
var arm := SpringArm3D.new()
var camera := Camera3D.new()
var entry := LineEdit.new()
var hint := Label.new()
var gait := preload("res://locomotion.gd").new()
var seat_object: Node3D
var avatar: Node3D
var third_person := false
var seated := false
var held_book: StaticBody3D
var before_seat := Vector3.ZERO
var focus: Object
const HEAD_LAYER := 19
const WALK_ACCEL := 8.0
const WALK_BRAKE := 12.0
const FOV_FILE := "user://room-camera.cfg"
var base_fov := 90.
var settings := AcceptDialog.new()
var choices := PopupMenu.new()

func _ready():
	var collider := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = .28
	capsule.height = 1.65
	collider.shape = capsule
	collider.position.y = .825
	add_child(collider)
	avatar = preload("res://models/Vita.vrm").instantiate()
	add_child(avatar)
	avatar.add_child(gait)
	gait.configure(avatar)
	avatar.rotation.y = PI
	for mesh in avatar.find_children("*","MeshInstance3D",true,false):
		if "face" in str(mesh.name).to_lower() or "hair" in str(mesh.name).to_lower():
			mesh.layers=1 << (HEAD_LAYER-1)
	camera.set_cull_mask_value(HEAD_LAYER,false)
	camera.keep_aspect=Camera3D.KEEP_WIDTH
	var config=ConfigFile.new()
	if config.load(FOV_FILE)==OK: base_fov=clampf(float(config.get_value("camera","horizontal_fov",90.)),65.,110.)
	camera.fov=base_fov
	add_child(preload("res://footsteps.gd").new())
	add_child(aim)
	aim.position.y = 1.48
	aim.add_child(arm)
	arm.spring_length = 0
	arm.add_excluded_object(get_rid())
	arm.add_child(camera)
	camera.near = .08
	camera.current = true
	var hud := CanvasLayer.new()
	add_child(hud)
	hud.add_child(hint)
	hint.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	hint.position += Vector2(18,-54)
	hint.mouse_filter=Control.MOUSE_FILTER_IGNORE
	hud.add_child(settings)
	settings.title="房间视野"
	var slider=HSlider.new()
	slider.custom_minimum_size.x=270
	slider.min_value=65
	slider.max_value=110
	slider.value=base_fov
	settings.add_child(slider)
	slider.value_changed.connect(func(value):
		base_fov=value
		settings.title="水平视野 %.0f°" % value)
	settings.visibility_changed.connect(func():
		if not settings.visible:
			config.set_value("camera","horizontal_fov",base_fov)
			config.save(FOV_FILE)
			Input.mouse_mode=Input.MOUSE_MODE_CAPTURED)
	hud.add_child(choices)
	choices.add_item("轻轻摸头", 0)
	choices.add_item("击掌", 1)
	choices.id_pressed.connect(func(id):
		if can_greet(): interacted.emit("user","head_pat" if id==0 else "high_five"))
	choices.popup_hide.connect(func(): Input.mouse_mode=Input.MOUSE_MODE_CAPTURED)
	hud.add_child(entry)
	entry.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	entry.custom_minimum_size.x = 420
	entry.placeholder_text = "对馨语说话 · Enter 发送"
	entry.hide()
	entry.text_submitted.connect(send_message)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func send_message(text: String):
	entry.hide()
	entry.release_focus()
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	if not text.strip_edges().is_empty():
		spoke.emit(text.strip_edges().left(500))
	entry.clear()

func can_greet():
	var ai=get_parent().get_node("Companion")
	var offset=ai.global_position-global_position
	return offset.length()<2.2 and (-camera.global_basis.z).dot(offset.normalized())>.5

func _unhandled_input(event):
	if entry.visible or settings.visible: return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		if seated: aim.rotate_y(-event.relative.x * .002)
		else: rotate_y(-event.relative.x * .002)
		aim.rotation.x = clamp(aim.rotation.x-event.relative.y*.002,-1.25,1.25)
	if event is InputEventMouseButton and event.pressed:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	if not event is InputEventKey or not event.pressed or event.echo: return
	match event.keycode:
		KEY_ESCAPE: Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		KEY_ENTER:
			entry.show()
			entry.grab_focus()
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		KEY_V:
			third_person = not third_person
			camera.set_cull_mask_value(HEAD_LAYER,third_person)
			arm.position.x = .30 if third_person else 0.
			arm.spring_length = 2.1 if third_person else 0.
		KEY_F2:
			Input.mouse_mode=Input.MOUSE_MODE_VISIBLE
			settings.popup_centered()
		KEY_F: interacted.emit("user","called")
		KEY_SPACE:
			if is_on_floor() and not seated: velocity.y = 4.3
		KEY_E:
			if can_greet() and held_book:
				var ai=get_parent().get_node("Companion")
				if ai.take_book(held_book):
					held_book=null
					interacted.emit("book","gave")
			elif can_greet():
				Input.mouse_mode=Input.MOUSE_MODE_VISIBLE
				choices.popup_centered()
			elif seated:
				seated = false
				seat_object = null
				avatar.position.y = 0
				aim.rotation.y = 0
				global_position = before_seat
				aim.position.y = 1.48
				interacted.emit("", "stand_up")
			elif focus and get_parent().marker_for(focus):
				var actions = get_parent().marker_for(focus).get_meta("affordances")
				if "sit" in actions:
					take_seat(focus)
				elif "pick_up" in actions:
					held_book = focus
					held_book.collision_layer = 0
					held_book.reparent(aim)
					held_book.position = Vector3(.2,-.22,-.45)
					interacted.emit("book","pick_up")
				else: interacted.emit(str(focus.name),actions[0])

func take_seat(obj):
	var seat = get_parent().seat_for(obj,self)
	if seat.is_empty(): return false
	before_seat = get_parent().approach_point(obj)
	seat_object = obj
	seated = true
	global_position = seat.pose.origin
	rotation.y = seat.pose.basis.get_euler().y + PI
	aim.rotation.x = 0
	aim.position.y = .74
	avatar.position.y = -.35
	align_seated_hips(obj)
	gait.playback.travel("Sitting_Idle")
	interacted.emit(str(obj.name),"sit")
	return true

func align_seated_hips(obj):
	await get_tree().create_timer(.6).timeout
	if seat_object!=obj: return
	var skeleton: Skeleton3D = avatar.find_children("*","Skeleton3D",true,false)[0]
	var hips=skeleton.to_global(skeleton.get_bone_global_pose(skeleton.find_bone("Hips")).origin)
	avatar.position.y += global_position.y+.08-hips.y

func _physics_process(delta):
	var direction := Vector3.ZERO
	if not entry.visible and not settings.visible and not choices.visible and not seated:
		direction = Vector3(float(Input.is_physical_key_pressed(KEY_D))-float(Input.is_physical_key_pressed(KEY_A)),0,
			float(Input.is_physical_key_pressed(KEY_S))-float(Input.is_physical_key_pressed(KEY_W)))
	direction = basis * direction.normalized()
	var speed := 3.8 if Input.is_physical_key_pressed(KEY_SHIFT) else 2.
	var horizontal=Vector2(velocity.x,velocity.z).move_toward(Vector2(direction.x,direction.z)*speed,delta*(WALK_ACCEL if direction else WALK_BRAKE))
	velocity.x=horizontal.x
	velocity.z=horizontal.y
	var rush=clampf((horizontal.length()-2.)/1.8,0.,1.) if not seated else 0.
	camera.fov=lerpf(camera.fov,base_fov+4.*rush,1.-exp(-4.*delta))
	if not seated:
		velocity.y -= 9.8*delta
		move_and_slide()
	gait.playback.travel("Sitting_Idle" if seated else "Walk" if direction.length_squared()>.01 else "Idle")
	var origin := camera.global_position
	var query := PhysicsRayQueryParameters3D.create(origin,origin-camera.global_basis.z*(2.2+arm.get_hit_length()))
	query.exclude = [get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	focus = hit.get("collider")
	hint.text = "·"
	if can_greet(): hint.text = "E · 递书" if held_book else "E · 摸头 / 击掌"
	elif seated: hint.text = "E · 起身"
	elif focus and focus.has_meta("affordances"): hint.text = "E · " + str(focus.name)
	elif get_parent().has_node("Companion") and global_position.distance_to(get_parent().get_node("Companion").global_position) < 2.2: hint.text = "Enter · 交谈"
