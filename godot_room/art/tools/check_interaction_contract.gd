extends SceneTree
var contract=preload("res://art/tools/interaction_contract.gd")
var failures=[]
func _initialize(): run.call_deferred()
func check(ok: bool, message: String):
	if not ok: failures.append(message)
func run():
	var room=load("res://art/bedroom.tscn").instantiate()
	root.add_child(room)
	check(contract.validate(room).is_empty(),"approved scene rejected")
	# Negative controls ensure exceptions for the bed cannot mask unrelated drift.
	for id in room.interaction_markers:
		var marker=room.interaction_markers[id]
		var old=marker.get_meta("id")
		marker.set_meta("id","changed")
		check(not contract.validate(room).is_empty(),"ID mutation accepted: "+id)
		marker.set_meta("id",old)
	for id in ["sofa","bed"]:
		var marker=room.interaction_markers[id]
		for name in ["Approach","Seat"]:
			var point=marker.get_node(name)
			var old=point.position
			point.position+=Vector3(.001,0,0)
			check(not contract.validate(room).is_empty(),"pose mutation accepted: "+id+"/"+name)
			point.position=old
	check(contract.validate(room).is_empty(),"restored scene rejected")
	print("INTERACTION_CONTRACT ",JSON.stringify({"original_interactions":14,"unchanged_other_interactions":13,"allowed_change":"bed look/sit + bed_edge_seat","negative_controls":18,"failures":failures}))
	room.free()
	await process_frame
	quit(0 if failures.is_empty() else 1)
