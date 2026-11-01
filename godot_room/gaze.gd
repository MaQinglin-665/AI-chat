extends SkeletonModifier3D

var target: Node3D
var gesture := ""
var began := 0

func play(name: String):
	gesture = name
	began = Time.get_ticks_msec()


func _process_modification():
	if not is_instance_valid(target): return
	var skel := get_skeleton()
	var head := skel.find_bone("Head")
	if head < 0: return
	var aim := skel.to_local(target.global_position + Vector3.UP * 1.2) - skel.get_bone_global_pose(head).origin
	if aim.length_squared() < .001: return
	var phase := clampf((Time.get_ticks_msec()-began)/1100.,0,1)
	var envelope := sin(PI*phase)
	var yaw := clampf(atan2(aim.x,aim.z),-.55,.55)
	var pitch := clampf(-asin(clampf(aim.normalized().y,-1.,1.)),-.22,.22)
	if gesture == "nod":
		pitch += .16 * sin(phase*TAU*2)*envelope
	elif gesture == "wave" and phase < 1.:
		for bone in ["RightUpperArm","RightLowerArm"]:
			var idx := skel.find_bone(bone)
			if idx < 0: continue
			var arm := skel.get_bone_global_pose(idx)
			var angle := -1.6 if bone == "RightUpperArm" else -1.1+.22*sin(phase*TAU*3)
			arm.basis = Basis(Vector3.BACK,angle*envelope)*arm.basis
			skel.set_bone_global_pose(idx,arm)
	for bone in ["Head","LeftEye","RightEye"]:
		var index := skel.find_bone(bone)
		if index < 0: continue
		var scale := .7 if bone == "Head" else .25
		var pose := skel.get_bone_global_pose(index)
		pose.basis = Basis(Vector3.UP,yaw*scale)*Basis(Vector3.RIGHT,pitch*scale)*pose.basis
		skel.set_bone_global_pose(index,pose)
