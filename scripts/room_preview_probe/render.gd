extends SceneTree

func _initialize():
	run.call_deferred()

func run():
	print("HWND ", DisplayServer.window_get_native_handle(DisplayServer.WINDOW_HANDLE))
	var view := SubViewport.new()
	view.size = Vector2i(320, 180)
	view.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(view)
	var room = load("res://art/bedroom.tscn").instantiate()
	view.add_child(room)
	room.set_quality_profile("low")
	var model = load("res://models/Shino.vrm").instantiate()
	room.add_child(model)
	var motion = load("res://locomotion.gd").new()
	model.add_child(motion)
	motion.configure(model)
	var camera := Camera3D.new()
	room.add_child(camera)
	camera.look_at_from_position(Vector3(0, 1.7, 3.65), Vector3(0, .95, 0))
	camera.current = true
	var rid := view.get_viewport_rid()
	RenderingServer.viewport_set_measure_render_time(rid, true)
	print("PID ", OS.get_process_id(), " ", RenderingServer.get_video_adapter_name())
	var stop_path := OS.get_cmdline_user_args()[0]
	for i in range(300):
		await process_frame
		RenderingServer.force_draw(false)
		if FileAccess.file_exists(stop_path):
			break
		var frame := view.get_texture().get_image().save_jpg_to_buffer(0.7)
		print("FRAME ", RenderingServer.viewport_get_measured_render_time_gpu(rid), " ", Marshalls.raw_to_base64(frame))
	quit()
