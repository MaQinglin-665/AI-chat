extends SceneTree
func _initialize(): run.call_deferred()

func run():
	var room := load("res://room.tscn").instantiate() as Node3D
	root.add_child(room)
	var player = room.get_node("Player")
	for i in range(10): await physics_frame
	var mirror=Camera3D.new()
	var hidden_parts=0
	for mesh in player.avatar.find_children("*","MeshInstance3D",true,false):
		if mesh.layers==(1 << (player.HEAD_LAYER-1)): hidden_parts+=1
	var layers_ok=hidden_parts>=2 and mirror.get_cull_mask_value(player.HEAD_LAYER) and not player.camera.get_cull_mask_value(player.HEAD_LAYER)
	mirror.free()
	if not layers_ok:
		push_error("Player head must be visible to the mirror only in first person")
		quit(4)
		return
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
	print("first person restored ",player.avatar.visible and not player.camera.get_cull_mask_value(player.HEAD_LAYER))
	quit(0 if player.avatar.visible and not player.camera.get_cull_mask_value(player.HEAD_LAYER) else 3)
