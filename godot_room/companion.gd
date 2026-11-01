extends CharacterBody3D
var agent := NavigationAgent3D.new()
var body: Node3D
var motion := preload("res://locomotion.gd").new()
var bubble := Label3D.new()
var follow := false
var sitting := false
var seat_object: Node3D
var bubble_time := 0.
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
	bubble.position.y = 2.04
	bubble.no_depth_test = true
	bubble.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
	bubble.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	bubble.font_size = 22
	bubble.pixel_size = .002
	add_child(bubble)
	look_target = player

func approach(node: Node3D):
	if sitting: stand()
	var offset = (global_position-node.global_position).slide(Vector3.UP).normalized()
	var approach_point = player.global_position + offset * 1.35 if node == player else get_parent().approach_point(node)
	agent.target_position = approach_point
	destination = str(node.name)
	own_state = "walking"

func stand():
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
	bubble_time -= delta
	bubble.visible = bubble_time > 0
	bubble.position.y = 1.68 if sitting else 2.04
	if NavigationServer3D.map_get_iteration_id(agent.get_navigation_map()) == 0: return
	last_follow -= delta
	var distance = global_position.distance_to(player.global_position)
	if follow and distance > 1.65 and last_follow <= 0:
		approach(player)
		last_follow = .8
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
	gaze.target = look_target
	agent.velocity = speed
	var facing = speed if speed.length() > .05 else global_position.direction_to(look_target.global_position) if look_target else Vector3.ZERO
	if facing.length() > .05 and not sitting:
		body.rotation.y = lerp_angle(body.rotation.y,atan2(facing.x,facing.z),1-exp(-delta*4))

func speak(text: String, emotion: String):
	bubble.text = text
	bubble_time = clampf(2. + text.length()*.22, 3., 26.)
	bubble.visible = not text.is_empty()
	bubble.width = 400
	bubble.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var face = body.find_child("Face",true,false)
	for i in range(face.get_blend_shape_count()):
		if str(face.mesh.get_blend_shape_name(i)).ends_with("Fcl_ALL_Joy"):
			face.set_blend_shape_value(i,.45 if emotion == "happy" else 0.)
