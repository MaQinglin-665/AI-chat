extends SkeletonModifier3D

var target: Node3D
var speech_envelope := 0.
var relaxed := false
var filtered := Vector2.ZERO
var eye_offset := Vector2.ZERO
var saccade_in := 0.
var fingers := []
var rig_ready := false
var pastime := ""
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
	var delta=get_process_delta_time()
	var clock=Time.get_ticks_msec()*.001
	filtered=filtered.lerp(Vector2(yaw,pitch),1.-exp(-delta*5.))
	yaw=filtered.x
	pitch=filtered.y
	saccade_in-=delta
	if saccade_in<=0:
		saccade_in=randf_range(.7,2.6)
		eye_offset=Vector2(randf_range(-.10,.10),randf_range(-.04,.04))
	if not rig_ready:
		rig_ready=true
		for i in skel.get_bone_count():
			var name_=skel.get_bone_name(i).to_lower()
			if not name_.ends_with("end") and ("index" in name_ or "middle" in name_ or "ring" in name_ or "little" in name_ or "pinky" in name_):
				fingers.append([i,-1. if ("right" in name_ or "_r_" in name_) else 1.])
	for finger in fingers:
		var index:int=finger[0]
		skel.set_bone_pose_rotation(index,skel.get_bone_pose_rotation(index)*Quaternion(Vector3.FORWARD,.17*finger[1]))
	if relaxed:
		for name_ in ["Chest","Hips"]:
			var i=skel.find_bone(name_)
			if i<0: continue
			var pose=skel.get_bone_global_pose(i)
			if name_=="Chest":
				pose.origin.y+=.006*sin(clock*1.51)
				pose.basis=Basis(Vector3.RIGHT,.013*sin(clock*1.51))*pose.basis
			else: pose.origin.x+=.012*sin(clock*.67)
			skel.set_bone_global_pose(i,pose)
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
	var t=(Time.get_ticks_msec()-began)*.001
	var weight=smoothstep(0.,.6,t)
	if pastime in ["read","stretch","yawn"] or gesture=="high_five" and phase<1.:
		if pastime=="read": pitch+=.21*weight
		for bone in ["LeftUpperArm","RightUpperArm","LeftLowerArm","RightLowerArm"]:
			var idx=skel.find_bone(bone)
			if idx<0: continue
			var side=-1. if bone.begins_with("Right") else 1.
			var arm=skel.get_bone_global_pose(idx)
			var angle=.48 if "Upper" in bone else .85
			if pastime=="stretch": angle=(1.5+.08*sin(t))*sin(PI*clampf(t/4.,0.,1.))
			if pastime=="yawn": angle=angle*1.35 if side<0 else 0.
			if gesture=="high_five" and phase<1.: angle=1.55*envelope if side<0 else 0.
			arm.basis=Basis(Vector3.BACK,side*angle*weight)*arm.basis
			skel.set_bone_global_pose(idx,arm)
	if speech_envelope>.001:
		var chest=skel.find_bone("Chest")
		if chest>=0:
			var upper=skel.get_bone_global_pose(chest)
			upper.basis=Basis(Vector3.RIGHT,-.032*speech_envelope)*upper.basis
			skel.set_bone_global_pose(chest,upper)
	for bone in ["Head","LeftEye","RightEye"]:
		var index := skel.find_bone(bone)
		if index < 0: continue
		var scale := .7 if bone == "Head" else .25
		var pose := skel.get_bone_global_pose(index)
		pose.basis = Basis(Vector3.UP,yaw*scale+(eye_offset.x if bone!="Head" else 0.))*Basis(Vector3.RIGHT,pitch*scale+(eye_offset.y if bone!="Head" else 0.))*pose.basis
		skel.set_bone_global_pose(index,pose)
