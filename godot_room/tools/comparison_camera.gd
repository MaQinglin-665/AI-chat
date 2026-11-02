extends SceneTree
func _initialize(): capture.call_deferred()
func capture():
	root.size=Vector2i(960,540)
	var room=load("res://room.tscn").instantiate()
	root.add_child(room)
	room.get_node("Companion").position=Vector3.ZERO
	var cam=Camera3D.new()
	room.add_child(cam)
	cam.fov=50
	cam.look_at_from_position(Vector3(0,1.7,3.65),Vector3(0,.95,0))
	cam.current=true
	for i in range(30): await process_frame
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("res://docs/spike/godot-room.png")
	quit()
