extends CharacterBody3D
var agent := NavigationAgent3D.new()
var body: Node3D
var motion := preload("res://locomotion.gd").new()
var caption := preload("res://room_caption.gd").new()
var voice := preload("res://room_voice.gd").new()
var bubble: Label:
	get: return caption.label
var follow := false
var sitting := false
var seat_object: Node3D

var seat_exit := Vector3.ZERO
var look_target: Node3D
var destination := ""
var posture_change := 0
var sit_target: Node3D
var player: CharacterBody3D
var last_follow := 0.
var contact := preload("res://foot_contact.gd").new()
var gaze := preload("res://gaze.gd").new()
var glance_after := 6.
var own_state := "idle"

var hand_socket: BoneAttachment3D
var book: StaticBody3D
var pastime := ""
var sleep_origin := Transform3D.IDENTITY
var desired_velocity := Vector3.ZERO
var turn_delay := 0.
var blink_in := 3.1
var blink_phase := 1.
var blink_face: MeshInstance3D
var blink_index := -1
var sleep_blend := 0.

func take_book(item:StaticBody3D):
	if book or not item: return false
	if not hand_socket:
		var skeleton:Skeleton3D=body.find_children("*","Skeleton3D",true,false)[0]
		hand_socket=BoneAttachment3D.new()
		skeleton.add_child(hand_socket)
		hand_socket.bone_name="RightHand"
	book=item
	book.collision_layer=0
	book.reparent(hand_socket)
	book.transform=Transform3D(Basis(Vector3.RIGHT,-.45),Vector3(.02,.04,.04))
	return true

func offer_book():
	if not book or player.held_book or position.distance_to(player.position)>2.2: return false
	book.reparent(player.aim)
	book.transform=Transform3D(Basis.IDENTITY,Vector3(.2,-.22,-.45))
	player.held_book=book
	book=null
	gaze.play("wave")
	return true

func end_pastime():
	if pastime=="tidy": motion.playback.travel("Idle")
	if pastime=="nap":
		body.transform=sleep_origin
		motion.playback.travel("Sitting_Idle")
	gaze.pastime=""
	pastime=""

func start_pastime(kind:String):
	end_pastime()
	if kind=="nap" and (not sitting or seat_object!=get_parent().target_object("bed_edge_seat")): return false
	if kind=="read" and (not book or not sitting): return false
	pastime=kind
	gaze.pastime=kind
	gaze.began=Time.get_ticks_msec()
	if kind=="nap":
		sleep_origin=body.transform
		sleep_blend=0.
		motion.playback.travel("Idle")
	if kind=="tidy": motion.playback.travel("Interact")
	return true

func _ready():
	player = get_parent().get_node("Player")
	body = preload("res://models/Shino.vrm").instantiate()
	add_child(body)
	var collision := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.height = 1.6
	capsule.radius = .27
	collision.shape = capsule
	collision.position.y = .8
	add_child(collision)
	add_child(preload("res://footsteps.gd").new())
	blink_face=body.find_child("Face",true,false)
	if blink_face:
		for i in blink_face.get_blend_shape_count():
			if str(blink_face.mesh.get_blend_shape_name(i)).ends_with("Fcl_EYE_Close"):
				blink_index=i
				break
	add_child(agent)
	agent.radius = .30
	agent.avoidance_enabled = true
	agent.target_desired_distance = .32
	agent.velocity_computed.connect(move_safe)
	body.add_child(motion)
	motion.configure(body)
	var skeleton = body.find_children("*","Skeleton3D",true,false)[0]
	contact.actor=self
	skeleton.add_child(contact)
	skeleton.add_child(gaze)
	add_child(caption)
	add_child(voice)
	look_target = player

func approach(node: Node3D):
	if sitting: stand()
	look_target=node
	turn_delay=.18
	var offset = (global_position-node.global_position).slide(Vector3.UP).normalized()
	var approach_point = player.global_position + offset * 1.35 if node == player else get_parent().approach_point(node)
	agent.target_position = approach_point
	destination = str(node.name)
	own_state = "walking"

func stand():
	end_pastime()
	if sitting: global_position=seat_exit
	posture_change += 1
	sitting = false
	seat_object = null
	body.position.y = 0
	motion.playback.travel("Sitting_Exit")
	own_state = "standing"
	var revision = posture_change
	await get_tree().create_timer(.9).timeout
	if revision == posture_change and own_state == "standing":
		motion.playback.travel("Idle")
		own_state = "idle"

func sit():
	seat_exit=global_position
	sitting = true
	posture_change += 1
	var revision = posture_change
	own_state = "sitting"
	var seat = get_parent().seat_for(sit_target,self)
	if seat.is_empty():
		sit_target = null
		stand()
		return
	seat_object = sit_target
	var pose: Transform3D = seat.pose
	global_position = Vector3(pose.origin.x,0,pose.origin.z)
	body.rotation.y = pose.basis.get_euler().y
	sit_target = null
	motion.playback.travel("Sitting_Enter")
	await get_tree().create_timer(1.1).timeout
	if revision != posture_change: return
	motion.playback.travel("Sitting_Idle")
	await get_tree().create_timer(.3).timeout
	if revision != posture_change: return
	var skeleton: Skeleton3D = body.find_children("*","Skeleton3D",true,false)[0]
	var hips = skeleton.to_global(skeleton.get_bone_global_pose(skeleton.find_bone("Hips")).origin)
	body.position.y += pose.origin.y + .08 - hips.y


func move_safe(safe: Vector3):
	if sitting: return
	velocity = safe
	move_and_slide()

func _physics_process(delta):
	if NavigationServer3D.map_get_iteration_id(agent.get_navigation_map()) == 0: return
	last_follow -= delta
	var distance = global_position.distance_to(player.global_position)
	blink_in-=delta
	if blink_in<=0:
		blink_in=randf_range(2.5,6.1)
		blink_phase=0.
	blink_phase=minf(1.,blink_phase+delta/.19)
	if blink_index>=0:
		blink_face.set_blend_shape_value(blink_index,1. if pastime=="nap" else sin(PI*blink_phase))
	turn_delay=maxf(0.,turn_delay-delta)
	if follow and distance > 1.65 and last_follow <= 0:
		approach(player)
		last_follow = .8
	if pastime=="nap":
		sleep_blend=minf(1.,sleep_blend+delta)
		var bed=get_parent().target_object("bed_edge_seat")
		var inward:Vector3=(bed.global_position-global_position).slide(Vector3.UP).normalized()
		var axis=Vector3.UP.cross(inward)
		if axis.length_squared()>.01:
			body.basis=Basis(axis.normalized(),1.48*smoothstep(0.,1.,sleep_blend))*sleep_origin.basis
			body.position=sleep_origin.origin.lerp(Vector3.UP*get_parent().seat_for(bed,self).pose.origin.y+inward*.28,smoothstep(0.,1.,sleep_blend))
	var speed := Vector3.ZERO
	if own_state == "walking" and not agent.is_navigation_finished():
		speed = global_position.direction_to(agent.get_next_path_position()).slide(Vector3.UP).normalized() * 1.25
		if distance < .80 and speed.dot(global_position.direction_to(player.global_position)) > 0:
			speed = speed.rotated(Vector3.UP,PI/2) * .55
		motion.playback.travel("Walk")
	elif own_state == "walking":
		own_state = "idle"
		motion.playback.travel("Idle")
		if sit_target:
			if (position-agent.target_position).slide(Vector3.UP).length()<.45: sit()
			else: sit_target=null
	if own_state == "idle":
		glance_after -= delta
		if distance < 2. and get_parent().get_node("Bridge").current.is_empty():
			look_target = player
		elif glance_after <= 0 and get_parent().get_node("Bridge").current.is_empty():
			look_target = get_parent().objects.values().pick_random()
			glance_after = randf_range(5,13)
		if distance < .85:
			speed = player.global_position.direction_to(global_position).slide(Vector3.UP).normalized()*.5
	if own_state=="walking":
		var remaining=global_position.distance_to(agent.target_position)
		speed=speed.limit_length(sqrt(2.*3.8*remaining))
	if turn_delay>0: speed=Vector3.ZERO
	desired_velocity=desired_velocity.move_toward(speed,delta*(2.6 if speed.length()>desired_velocity.length() else 4.2))
	gaze.target = look_target
	gaze.relaxed=own_state=="idle" and pastime.is_empty()
	agent.velocity = desired_velocity if not sitting else Vector3.ZERO
	var facing = speed if speed.length() > .05 else global_position.direction_to(look_target.global_position) if look_target else Vector3.ZERO
	if facing.length() > .05 and not sitting and turn_delay<=0:
		body.rotation.y = lerp_angle(body.rotation.y,atan2(facing.x,facing.z),1-exp(-delta*4))

func speak(text: String, emotion: String):
	caption.show_line(text)
	voice.utter(text)
	var face = body.find_child("Face",true,false)
	for i in range(face.get_blend_shape_count()):
		if str(face.mesh.get_blend_shape_name(i)).ends_with("Fcl_ALL_Joy"):
			face.set_blend_shape_value(i,.45 if emotion == "happy" else 0.)
