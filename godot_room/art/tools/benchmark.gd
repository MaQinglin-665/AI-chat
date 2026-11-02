extends SceneTree
func _initialize(): run.call_deferred()
func run():
	var args=OS.get_cmdline_user_args()
	var profile=args[0] if args.size()>0 else "balanced"
	var label=args[1] if args.size()>1 else "dgpu"
	root.size=Vector2i(960,540) if profile=="low" else Vector2i(1280,720)
	root.msaa_3d=Viewport.MSAA_DISABLED if profile=="low" else Viewport.MSAA_2X
	var room=load("res://art/bedroom.tscn").instantiate()
	root.add_child(room)
	room.set_quality_profile(profile)
	var model=load("res://models/Shino.vrm").instantiate()
	room.add_child(model)
	var motion=load("res://locomotion.gd").new()
	model.add_child(motion)
	motion.configure(model)
	var camera:=Camera3D.new()
	room.add_child(camera)
	camera.fov=50
	camera.look_at_from_position(Vector3(0,1.7,3.65),Vector3(0,.95,0))
	camera.current=true
	var rid=root.get_viewport_rid()
	RenderingServer.viewport_set_measure_render_time(rid,true)
	for i in range(240):await process_frame
	print("BENCH_READY ",OS.get_process_id())
	var samples := []
	var previous=Time.get_ticks_usec()
	var started=Time.get_ticks_msec()
	# Time-bounded sampling avoids very short windows on fast dedicated GPUs.
	while Time.get_ticks_msec()-started<12000:
		await process_frame
		var now=Time.get_ticks_usec()
		samples.append({"frame_ms":(now-previous)/1000.0,"cpu_render_ms":RenderingServer.viewport_get_measured_render_time_cpu(rid)+RenderingServer.get_frame_setup_time_cpu(),"gpu_render_ms":RenderingServer.viewport_get_measured_render_time_gpu(rid)})
		previous=now
	var report={"engine":Engine.get_version_info().string,"renderer":RenderingServer.get_current_rendering_method(),"adapter":RenderingServer.get_video_adapter_name(),"profile":profile,"resolution":[root.size.x,root.size.y],"process_id":OS.get_process_id(),"samples":samples,"triangles":Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME),"draw_calls":Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME),"video_memory_bytes":Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED)}
	var path="user://bedroom-benchmark-"+label+".json"
	var file=FileAccess.open(path,FileAccess.WRITE)
	file.store_string(JSON.stringify(report))
	print("ART_BENCHMARK ",OS.get_user_data_dir()+"/bedroom-benchmark-"+label+".json")
	room.free()
	await process_frame
	quit()
