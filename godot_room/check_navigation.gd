extends SceneTree
# Exercise actual navigation, clips, chair arrival and standing without an LLM.
func _initialize(): verify.call_deferred()
func verify():
	var room = load("res://room.tscn").instantiate()
	root.add_child(room)
	for i in range(8): await physics_frame
	var ai = room.get_node("Companion")
	var skel = ai.body.find_children("*","Skeleton3D",true,false)[0]
	var face = ai.body.find_child("Face",true,false)
	var mouth_index = -1
	for i in range(face.get_blend_shape_count()):
		if str(face.mesh.get_blend_shape_name(i)).ends_with("Fcl_MTH_A"): mouth_index=i
	if mouth_index < 0: quit(1); return
	face.set_blend_shape_value(mouth_index,.65)
	print("mouth A applied ",face.get_blend_shape_value(mouth_index))
	ai.contact.collect_samples=true
	var start = ai.position
	ai.sit_target = room.objects.chair
	ai.approach(room.objects.chair)
	var feet = [skel.find_bone("LeftFoot"),skel.find_bone("RightFoot")]
	var previous := []
	var slip := []
	for i in range(600):
		await physics_frame
		if ai.sitting: break
		var current := []
		for bone in feet: current.append(skel.to_global(skel.get_bone_global_pose(bone).origin))
		if previous.size() == 2 and ai.velocity.length() > 1.:
			var lower = 0 if current[0].y < current[1].y else 1
			slip.append((current[lower]-previous[lower]).slide(Vector3.UP).length()*60.)
		previous = current
	slip.sort()
	var drifts=ai.contact.drift_samples
	drifts.sort()
	if not drifts.is_empty(): print("planted ankle horizontal displacement m: median ",drifts[drifts.size()/2]," p95 ",drifts[int(.95*drifts.size())])
	print("travel ",start.distance_to(ai.position)," sat ",ai.sitting," lower-foot horizontal median m/s ",slip[slip.size()/2] if slip else -1)
	if not ai.sitting:
		print("stalled ",ai.position," next ",ai.agent.get_next_path_position()," target ",ai.agent.target_position," state ",ai.own_state," collisions ",ai.get_slide_collision_count())
		for i in ai.get_slide_collision_count(): print(ai.get_slide_collision(i).get_collider().name)
		quit(2)
		return
	for i in range(90): await physics_frame
	print("seat clip ",ai.motion.playback.get_current_node())
	ai.stand()
	for i in range(90): await physics_frame
	print("stand clip ",ai.motion.playback.get_current_node())
	quit(0 if ai.own_state == "idle" else 3)
