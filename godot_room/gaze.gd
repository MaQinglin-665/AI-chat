extends SkeletonModifier3D

var target: Node3D

func _process_modification():
	if not is_instance_valid(target): return
	var skel := get_skeleton()
	var head := skel.find_bone("Head")
	if head < 0: return
	var aim := skel.to_local(target.global_position + Vector3.UP * 1.2) - skel.get_bone_global_pose(head).origin
	if aim.length_squared() < .001: return
	var yaw := clampf(atan2(aim.x,aim.z),-.55,.55)
	var pitch := clampf(-asin(clampf(aim.normalized().y,-1.,1.)),-.22,.22)
	for bone in ["Head","LeftEye","RightEye"]:
		var index := skel.find_bone(bone)
		if index < 0: continue
		var scale := .7 if bone == "Head" else .25
		var pose := skel.get_bone_global_pose(index)
		pose.basis = Basis(Vector3.UP,yaw*scale)*Basis(Vector3.RIGHT,pitch*scale)*pose.basis
		skel.set_bone_global_pose(index,pose)
