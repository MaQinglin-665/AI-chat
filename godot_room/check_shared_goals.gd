extends SceneTree
var bridge
var room
var failed := false
func _initialize(): run.call_deferred()
func check(ok, label):
	if not ok:
		failed=true
		push_error(label)
func run():
	room=load("res://room.tscn").instantiate()
	root.add_child(room)
	bridge=room.get_node("Bridge")
	bridge.token=""
	bridge.utility_clock=9999
	for i in range(5): await physics_frame
	var p=bridge.player
	check(bridge.capabilities().has("bed_edge_seat"),"discover bed seat from metadata")
	bridge.accept({"action":{"action":"go_to","target":"bed_edge_seat"},"goal":[{"action":"sit_on","target":"bed_edge_seat"}]},"autonomous")
	for i in range(1200):
		await physics_frame
		if bridge.current.is_empty(): break
	check(bridge.goal.status=="completed" and bridge.ai.sitting and bridge.ai.seat_object==room.objects.bed,"Shino sits on bed edge")
	check(not p.take_seat(room.objects.bed),"occupied bed edge")
	bridge.accept({"action":{"action":"stand_up"}},"autonomous")
	for i in range(240):
		await physics_frame
		if bridge.current.is_empty(): break
	check(not bridge.ai.sitting and bridge.goal.status=="completed","Shino stands from bed edge")
	bridge.receipts.clear()
	check(p.take_seat(room.objects.sofa),"player sofa seat")
	var facing=-p.camera.global_basis.z
	bridge.accept({"action":{"action":"go_to","target":"sofa"},"goal":[{"action":"sit_on","target":"sofa"}]},"user")
	for i in range(1200):
		await physics_frame
		if bridge.current.is_empty(): break
	check(bridge.goal.status=="completed" and bridge.ai.sitting,"sofa goal must finish seated")
	var ai=bridge.ai
	var separation=(ai.position-p.position).slide(Vector3.UP).length()
	var eye_clearance=(ai.position-p.camera.global_position).slide(Vector3.UP).length()-.30
	var angle=rad_to_deg(facing.angle_to(ai.body.global_basis.z))
	print("adjacent seats: centres=",separation," camera envelope clearance=",eye_clearance," facing=",angle)
	check(separation>=.91 and angle<15 and eye_clearance>.45,"separate cushions, same forward direction and clear eye")
	check(p.camera.near<eye_clearance,"near plane outside model envelope")
	if DisplayServer.get_name()!="headless":
		# Closest point on an enclosing box is a conservative lower bound on
		# the distance to any triangle. Bake the currently animated pose first.
		var lower_bound := INF
		for node in ai.body.find_children("*","MeshInstance3D",true,false):
			if not node.is_visible_in_tree(): continue
			var posed = node.bake_mesh_from_current_skeleton_pose() if node.skin else node.mesh
			if not posed: continue
			var box: AABB = node.global_transform * posed.get_aabb()
			var eye: Vector3 = p.camera.global_position
			lower_bound=minf(lower_bound,eye.distance_to(eye.clamp(box.position,box.end)))
		print("eye to posed model box minimum m ",lower_bound)
		check(is_finite(lower_bound) and lower_bound>.35,"first-person eye outside every posed mesh")
	check(bridge.receipts.size()==2,"one terminal receipt per step")
	var posture = ai.posture_change
	bridge.accept({"action":{"action":"go_to","target":"user"},"goal":[{"action":"sit_on","target":"sofa"}]},"user")
	check(bridge.goal.status=="completed" and ai.posture_change==posture,"same-seat confirmation keeps both actors seated")
	bridge.accept({"action":{"action":"idle","seconds":10}},"autonomous")
	var protected_id=bridge.goal_id
	bridge.utility_clock=-1
	for i in range(12): await physics_frame
	check(bridge.goal_id==protected_id and bridge.current.action=="idle","utility cannot replace running goal")
	bridge.event("spoke")
	check(bridge.goal.status=="interrupted" and bridge.steps.is_empty(),"clear interrupted goal")
	p.take_seat(room.objects.chair)
	bridge.accept({"action":{"action":"sit_on","target":"chair"}},"user")
	check(bridge.goal.status=="failed" and bridge.goal.reason=="occupied","occupied chair rejected")
	quit(1 if failed else 0)
