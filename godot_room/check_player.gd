extends SceneTree
func _initialize(): run.call_deferred()

func run():
	var room := load("res://room.tscn").instantiate() as Node3D
	root.add_child(room)
	var player = room.get_node("Player")
	for i in range(10): await physics_frame
	var toggle := InputEventKey.new()
	toggle.keycode = KEY_V
	toggle.pressed = true
	player._unhandled_input(toggle)
	player.position = Vector3(0,0,3.3)
	for i in range(10): await physics_frame
	print("shoulder camera z ",player.camera.global_position.z," wall inside z=3.925; arm length ",player.arm.get_hit_length())
	if not player.third_person or player.camera.global_position.z > 3.925: quit(1); return
	toggle.keycode = KEY_SPACE
	player._unhandled_input(toggle)
	var highest := 0.
	for i in range(90):
		await physics_frame
		highest = maxf(highest,player.position.y)
	print("jump apex m ",highest)
	if highest < .4 or not player.is_on_floor(): quit(2); return
	toggle.keycode = KEY_V
	player._unhandled_input(toggle)
	print("first person restored ",not player.avatar.visible)
	quit(0 if not player.avatar.visible else 3)
