extends SceneTree
# Offline visual/performance acceptance only. Never creates bridge/network/player.
var room
var model
var camera:=Camera3D.new()
var motion
var output := "res://art/docs/"
func _initialize(): capture.call_deferred()
func frames(count: int):
	for i in range(count):await process_frame
	await RenderingServer.frame_post_draw
func shot(name: String):
	await frames(15)
	var image=root.get_texture().get_image()
	image.save_png(output+name+".png")
	print("ART_SHOT ",name)
func capture():
	root.size=Vector2i(1280,720)
	root.msaa_3d=Viewport.MSAA_2X
	room=load("res://art/bedroom.tscn").instantiate()
	root.add_child(room)
	model=load("res://models/Shino.vrm").instantiate()
	room.add_child(model)
	motion=load("res://locomotion.gd").new()
	model.add_child(motion)
	motion.configure(model)
	room.add_child(camera)
	camera.fov=50
	camera.current=true
	camera.look_at_from_position(Vector3(0,1.7,3.65),Vector3(0,.95,0))
	for preset in ["day","dusk","night"]:
		room.set_lighting_preset(preset)
		await frames(60)
		await shot("01-comparison-"+preset)
	# Additional interior angles, same public Shino only.
	camera.look_at_from_position(Vector3(3.85,2.5,3.55),Vector3(-.7,.85,-.4))
	await shot("02-room-wide-night")
	camera.look_at_from_position(Vector3(-.5,1.9,-3.3),Vector3(-2.3,.75,1.2))
	await shot("03-bed-and-textiles")
	camera.look_at_from_position(Vector3(-.4,1.7,1.4),Vector3(2.6,1.0,-2.1))
	await shot("04-desk-and-shelf")
	var marker=room.interaction_markers.sofa
	var seat=marker.get_node(marker.get_meta("seat"))
	model.position=Vector3(seat.global_position.x,0,seat.global_position.z)
	model.rotation.y=seat.global_rotation.y
	motion.playback.travel("Sitting_Idle")
	await frames(120)
	var skeleton=model.find_children("*","Skeleton3D",true,false)[0]
	var hips=skeleton.to_global(skeleton.get_bone_global_pose(skeleton.find_bone("Hips")).origin)
	# Retargeted hip pivot is above the actual seat contact; align the visual only.
	model.position.y=seat.global_position.y+.08-hips.y
	print("ART_SEAT_CALIBRATION seat_y=",seat.global_position.y," hip_y=",hips.y," root_y=",model.position.y)
	camera.look_at_from_position(Vector3(-.35,1.45,1.35),Vector3(-3,1.0,-.95))
	await shot("05-shino-sofa-night")
	room.ceiling.hide()
	# Navigation is the actual baked mesh, with a translucent diagnostic overlay.
	model.position=Vector3.ZERO
	model.rotation=Vector3.ZERO
	motion.playback.travel("Idle")
	var nav=room.region.navigation_mesh
	var mesh:=ImmediateMesh.new()
	var mat:=StandardMaterial3D.new()
	mat.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color=Color(.14,.75,.63,.5)
	mat.cull_mode=BaseMaterial3D.CULL_DISABLED
	mesh.surface_begin(Mesh.PRIMITIVE_TRIANGLES,mat)
	var vertices=nav.get_vertices()
	for i in range(nav.get_polygon_count()):
		var polygon=nav.get_polygon(i)
		for j in range(1,polygon.size()-1):
			for index in [polygon[0],polygon[j],polygon[j+1]]:mesh.surface_add_vertex(vertices[index]+Vector3(0,.035,0))
	mesh.surface_end()
	var debug:=MeshInstance3D.new()
	debug.mesh=mesh
	room.add_child(debug)
	camera.look_at_from_position(Vector3(0,6.8,2.8),Vector3(0,0,-.2))
	await shot("06-baked-navigation")
	debug.free()
	room.ceiling.show()
	camera.look_at_from_position(Vector3(0,1.7,3.65),Vector3(0,.95,0))
	await frames(120)
	var rid=root.get_viewport_rid()
	RenderingServer.viewport_set_measure_render_time(rid,true)
	var samples := []
	var previous=Time.get_ticks_usec()
	for i in range(600):
		await process_frame
		var now=Time.get_ticks_usec()
		if i>59:samples.append({"frame_ms":(now-previous)/1000.0,"cpu_render_ms":RenderingServer.viewport_get_measured_render_time_cpu(rid)+RenderingServer.get_frame_setup_time_cpu(),"gpu_render_ms":RenderingServer.viewport_get_measured_render_time_gpu(rid)})
		previous=now
	var report={"engine":Engine.get_version_info().string,"renderer":RenderingServer.get_current_rendering_method(),"adapter":RenderingServer.get_video_adapter_name(),"resolution":[1280,720],"samples":samples,"triangles":Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME),"draw_calls":Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME),"video_memory_bytes":Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED)}
	var file=FileAccess.open("user://bedroom-performance.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(report))
	print("ART_PERFORMANCE ",OS.get_user_data_dir()+"/bedroom-performance.json")
	room.free()
	await process_frame
	quit()
