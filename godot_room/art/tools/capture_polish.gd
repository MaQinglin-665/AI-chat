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
	var phase="after"
	if args.size()>0 and args[0]!="after":
		push_error("This captures the current artwork only; frozen before images must not be overwritten.")
		quit(1)
		return
	var output="res://art/docs/polish/"
	DirAccess.make_dir_recursive_absolute(output)
	root.size=Vector2i(1280,720)
	root.msaa_3d=Viewport.MSAA_2X
	var room=load("res://art/bedroom.tscn").instantiate()
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
	camera.look_at_from_position(Vector3(3.85,2.5,3.55),Vector3(-.7,.85,-.4))
	await frames(30)
	root.get_texture().get_image().save_png(output+phase+"-wide.png")
	# Extra close views show the living details without moving any interaction point.
	camera.look_at_from_position(Vector3(-.4,1.7,1.4),Vector3(2.6,1.0,-2.1))
	await frames(30)
	root.get_texture().get_image().save_png(output+phase+"-desk.png")
	camera.look_at_from_position(Vector3(-.6,2.15,3.4),Vector3(-3.0,.90,1.8))
	await frames(30)
	root.get_texture().get_image().save_png(output+phase+"-bed.png")
	if phase=="after":
		camera.look_at_from_position(Vector3(-1.9,1.85,-1.95),Vector3(-1.85,1.85,-3.82))
		await frames(30)
		root.get_texture().get_image().save_png(output+phase+"-window.png")
	room.free()
	await process_frame
	quit()
