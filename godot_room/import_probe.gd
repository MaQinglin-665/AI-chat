extends SceneTree
func _initialize():
	run.call_deferred()

func run():
	var model = load("res://models/Shino.vrm").instantiate()
	root.add_child(model)
	var skel = model.find_children("*", "Skeleton3D", true, false)[0]
	var face = model.find_child("Face", true, false)
	var camera = Camera3D.new()
	root.add_child(camera)
	camera.fov = 32
	camera.look_at_from_position(Vector3(0, 1, 3), Vector3(0, .86, 0))
	var light = DirectionalLight3D.new()
	root.add_child(light)
	light.rotation_degrees = Vector3(-35,-20,0)
	var env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#494256")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color.WHITE
	env.ambient_light_energy = .55
	camera.environment = env
	root.size = Vector2i(800,800)
	var sec = model.find_child("secondary",true,false)
	var first = {}
	var peak = {}
	for i in range(180):
		if i == 30: camera.look_at_from_position(Vector3(3,1,0), Vector3(0,.86,0))
		if i == 55:
			camera.look_at_from_position(Vector3(0,1.49,.8), Vector3(0,1.42,0))
			for j in range(face.get_blend_shape_count()):
				var shape = str(face.mesh.get_blend_shape_name(j))
				if "JOY" in shape.to_upper() or shape == "Fcl_MTH_A":
					face.set_blend_shape_value(j, .8)
					print("expression ", shape)
		if i >= 80:
			model.position.x = .17*sin(i*.12)
			skel.set_bone_pose_rotation(skel.find_bone("Head"),Quaternion(Vector3.UP,.45*sin(i*.1)))
		await process_frame
		await RenderingServer.frame_post_draw
		if i >= 78:
			for chain in sec.spring_bones_internal:
				for joint in chain.verlets:
					var id = skel.get_bone_name(joint.bone_idx)
					var parent = skel.get_bone_global_pose(joint.parent_idx)
					var q = (parent.affine_inverse()*joint.global_pose).basis.orthonormalized().get_rotation_quaternion()
					if not first.has(id): first[id] = q
					peak[id] = max(peak.get(id,0.),rad_to_deg(first[id].angle_to(q)))
		if i in [20,50,75,110,120,130]:
			root.get_texture().get_image().save_png("res://docs/spike/shino-%03d.png" % i)
	print("joint excursions (degrees) ",peak)
	quit()
