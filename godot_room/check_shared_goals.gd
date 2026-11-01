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
	p.seated=true
	p.position=room.objects.sofa.position+Vector3.UP*.29
	bridge.accept({"action":{"action":"go_to","target":"sofa"},"goal":[{"action":"sit_on","target":"sofa"}]},"user")
	for i in range(1200):
		await physics_frame
		if bridge.current.is_empty(): break
	check(bridge.goal.status=="completed" and bridge.ai.sitting,"sofa goal must finish seated")
	check(abs(bridge.ai.position.x-p.position.x)>.45,"use adjacent cushion")
	check(bridge.receipts.size()==2,"one terminal receipt per step")
	bridge.accept({"action":{"action":"idle","seconds":10}},"autonomous")
	var protected_id=bridge.goal_id
	bridge.utility_clock=-1
	for i in range(12): await physics_frame
	check(bridge.goal_id==protected_id and bridge.current.action=="idle","utility cannot replace running goal")
	bridge.event("spoke")
	check(bridge.goal.status=="interrupted" and bridge.steps.is_empty(),"clear interrupted goal")
	p.position=room.objects.chair.position
	bridge.accept({"action":{"action":"sit_on","target":"chair"}},"user")
	check(bridge.goal.status=="failed" and bridge.goal.reason=="occupied","occupied chair rejected")
	quit(1 if failed else 0)
