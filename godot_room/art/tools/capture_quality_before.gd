extends SceneTree
# Silent, isolated art QA. No player, bridge, audio or network.
func _initialize():
	Engine.max_fps=30
	run.call_deferred()
func frames(count: int):
	for i in range(count): await process_frame
	await RenderingServer.frame_post_draw
func run():
	var args=OS.get_cmdline_user_args()
	var phase="before"
	if args.size()>0:
		push_error("This captures the current artwork only; frozen before images must not be overwritten.")
		quit(1)
		return
	var output="res://art/docs/quality/"
	if FileAccess.file_exists(output+"before-day.png"):
		push_error("Frozen baseline already exists; capture in a separate checkout/output directory.")
		quit(1)
		return
	DirAccess.make_dir_recursive_absolute(output)
	root.size=Vector2i(1280,720)
	root.msaa_3d=Viewport.MSAA_2X
	var room=load("res://art/bedroom.tscn").instantiate()
	room.quality_visuals=false
	root.add_child(room)
	var model=load("res://models/Shino.vrm").instantiate()
	room.add_child(model)
	var motion=load("res://locomotion.gd").new()
	model.add_child(motion)
	motion.configure(model)
	var camera=Camera3D.new()
	room.add_child(camera)
	camera.fov=50
	camera.current=true
	camera.look_at_from_position(Vector3(0,1.7,3.65),Vector3(0,.95,0))
	for preset in ["day","dusk","night"]:
		room.set_lighting_preset(preset)
		await frames(75)
		root.get_texture().get_image().save_png(output+phase+"-"+preset+".png")
		print("POLISH_SHOT ",phase,"-",preset)
	room.free()
	await process_frame
	quit()
