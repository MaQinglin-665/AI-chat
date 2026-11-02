extends SceneTree
func _initialize():
	Engine.max_fps=30
	run.call_deferred()
func run():
	root.size=Vector2i(1280,720)
	root.msaa_3d=Viewport.MSAA_2X
	var room=load("res://art/bedroom.tscn").instantiate()
	root.add_child(room)
	var camera=Camera3D.new()
	room.add_child(camera)
	camera.current=true
	camera.fov=50
	camera.look_at_from_position(Vector3(0,1.7,3.65),Vector3(0,.95,0))
	var floor_mesh=room.region.get_node("floor/OakFloor")
	var original=ShaderMaterial.new()
	original.shader=load("res://art/tools/fixtures/wood-before.gdshader")
	original.set_shader_parameter("tint",Color("a77b58"))
	var matte=original.duplicate()
	var shader=Shader.new()
	shader.code=original.shader.code.replace("ROUGHNESS = 0.62;","ROUGHNESS = 0.62; SPECULAR = 0.0;")
	matte.shader=shader
	for variant in ["original","no-specular","no-practicals"]:
		floor_mesh.material_override=matte if variant=="no-specular" else original
		room.set_lighting_preset("night")
		if variant=="no-practicals":
			for light in room.practicals: light.light_energy=0.0
		for i in range(75): await process_frame
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("user://polish-diagnostic-"+variant+".png")
		print("FLOOR_DIAGNOSTIC ",variant)
	room.free()
	await process_frame
	quit()
