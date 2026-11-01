extends CharacterBody3D

signal spoke(text: String)
signal interacted(object_id: String, action: String)
var aim := Node3D.new()
var arm := SpringArm3D.new()
var camera := Camera3D.new()
var entry := LineEdit.new()
var hint := Label.new()
var gait := preload("res://locomotion.gd").new()
var avatar: Node3D
var third_person := false
var seated := false
var held_book: StaticBody3D
var before_seat := Vector3.ZERO
var focus: Object

func _ready():
	var collider := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = .28
	capsule.height = 1.65
	collider.shape = capsule
	collider.position.y = .825
	add_child(collider)
	avatar = preload("res://models/Shino.vrm").instantiate()
	add_child(avatar)
	avatar.add_child(gait)
	gait.configure(avatar)
	avatar.rotation.y = PI
	avatar.visible = false
	add_child(aim)
	aim.position.y = 1.48
	aim.add_child(arm)
	arm.spring_length = 0
	arm.add_excluded_object(get_rid())
	arm.add_child(camera)
	camera.current = true
	var hud := CanvasLayer.new()
	add_child(hud)
	hud.add_child(hint)
	hint.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
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

func _unhandled_input(event):
	if entry.visible: return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * .002)
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
			avatar.visible = third_person
			arm.position.x = .30 if third_person else 0.
			arm.spring_length = 2.1 if third_person else 0.
		KEY_SPACE:
			if is_on_floor() and not seated: velocity.y = 4.3
		KEY_E:
			if seated:
				seated = false
				global_position = before_seat
				aim.position.y = 1.48
				interacted.emit("", "stand_up")
			elif held_book and focus == get_parent().get_node("Companion"):
				var receiver = focus.find_child("GeneralSkeleton",true,false)
				var hand := BoneAttachment3D.new()
				receiver.add_child(hand)
				hand.bone_name = "RightHand"
				held_book.reparent(hand)
				held_book.transform = Transform3D.IDENTITY
				held_book = null
				interacted.emit("book","gave")
			elif focus and focus.has_meta("affordances"):
				var actions = focus.get_meta("affordances")
				if "sit" in actions:
					before_seat = global_position
					seated = true
					global_position = focus.global_position + Vector3(0,.29,0)
					aim.position.y = .8
					interacted.emit(str(focus.name),"sit")
				elif "pick_up" in actions:
					held_book = focus
					held_book.collision_layer = 0
					held_book.reparent(aim)
					held_book.position = Vector3(.2,-.22,-.45)
					interacted.emit("book","pick_up")
				else: interacted.emit(str(focus.name),actions[0])

func _physics_process(delta):
	var direction := Vector3.ZERO
	if not entry.visible and not seated:
		direction = Vector3(float(Input.is_physical_key_pressed(KEY_D))-float(Input.is_physical_key_pressed(KEY_A)),0,
			float(Input.is_physical_key_pressed(KEY_S))-float(Input.is_physical_key_pressed(KEY_W)))
	direction = basis * direction.normalized()
	var speed := 3.8 if Input.is_physical_key_pressed(KEY_SHIFT) else 2.
	velocity.x = direction.x * speed
	velocity.z = direction.z * speed
	if not seated:
		velocity.y -= 9.8*delta
		move_and_slide()
	gait.playback.travel("Sitting_Idle" if seated else "Walk" if direction.length_squared() > .01 else "Idle")
	var origin := camera.global_position
	var query := PhysicsRayQueryParameters3D.create(origin,origin-camera.global_basis.z*(2.2+arm.get_hit_length()))
	query.exclude = [get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	focus = hit.get("collider")
	hint.text = "·"
	if seated: hint.text = "E · 起身"
	elif focus and focus.has_meta("affordances"): hint.text = "E · " + str(focus.name)
	elif get_parent().has_node("Companion") and global_position.distance_to(get_parent().get_node("Companion").global_position) < 2.2: hint.text = "Enter · 交谈"
