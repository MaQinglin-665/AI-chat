extends SkeletonModifier3D
# Preserve the lower ankle's horizontal contact during the support phase.
var actor: CharacterBody3D
var side := ""
var anchor := Vector3.ZERO
var drift_samples := []
var collect_samples := false

func rotate_bone(s: Skeleton3D, bone: int, from: Vector3, to: Vector3):
	if from.length_squared() < .000001 or to.length_squared() < .000001: return
	var pose := s.get_bone_global_pose(bone)
	pose.basis = Basis(Quaternion(from.normalized(),to.normalized()))*pose.basis
	s.set_bone_global_pose(bone,pose)

func _process_modification():
	if not actor or actor.own_state != "walking" or actor.velocity.slide(Vector3.UP).length() < .15:
		side = ""
		return
	var s := get_skeleton()
	var left := s.get_bone_global_pose(s.find_bone("LeftFoot")).origin
	var right := s.get_bone_global_pose(s.find_bone("RightFoot")).origin
	var low := "Left" if left.y < right.y else "Right"
	if abs(left.y-right.y) < .018 and side != "": low=side
	var foot := s.find_bone(low+"Foot")
	var knee := s.find_bone(low+"LowerLeg")
	var hip := s.find_bone(low+"UpperLeg")
	var ankle := s.get_bone_global_pose(foot)
	if low != side:
		side=low
		anchor=s.to_global(ankle.origin)
	var goal := s.to_local(anchor)
	goal.y=ankle.origin.y
	var h := s.get_bone_global_pose(hip).origin
	var k := s.get_bone_global_pose(knee).origin
	var upper := h.distance_to(k)
	var lower := k.distance_to(ankle.origin)
	# If the support leg reaches extension, let the pelvis yield before
	# solving the knee. Otherwise clamping the reach drags the planted foot.
	var excess := h.distance_to(goal) - (upper + lower - .003)
	if excess > 0:
		var pelvis := s.find_bone("Hips")
		var pose := s.get_bone_global_pose(pelvis)
		pose.origin += h.direction_to(goal) * minf(excess,.12)
		s.set_bone_global_pose(pelvis,pose)
		h = s.get_bone_global_pose(hip).origin
		k = s.get_bone_global_pose(knee).origin
	var axis := h.direction_to(goal)
	var distance := clampf(h.distance_to(goal),abs(upper-lower)+.001,upper+lower-.001)
	var bend := (k-h).slide(axis).normalized()
	if bend.length_squared() < .1: return
	var along := (upper*upper-lower*lower+distance*distance)/(2*distance)
	var knee_target := h+axis*along+bend*sqrt(maxf(0,upper*upper-along*along))
	rotate_bone(s,hip,k-h,knee_target-h)
	k=s.get_bone_global_pose(knee).origin
	rotate_bone(s,knee,s.get_bone_global_pose(foot).origin-k,h+axis*distance-k)
	var solved := s.get_bone_global_pose(foot)
	solved.basis=ankle.basis
	s.set_bone_global_pose(foot,solved)
	if collect_samples:
		drift_samples.append((s.to_global(solved.origin)-anchor).slide(Vector3.UP).length())
