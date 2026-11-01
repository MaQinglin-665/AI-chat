extends RefCounted
static func encode(value):
	if value is Vector3: return [value.x,value.y,value.z]
	if value is NodePath or value is StringName: return str(value)
	return value
static func node_snapshot(node: Node3D):
	var meta={}
	for key in node.get_meta_list(): meta[str(key)]=encode(node.get_meta(key))
	return {"path":str(node.get_path()),"position":encode(node.position),"rotation":encode(node.rotation),"scale":encode(node.scale),"global_position":encode(node.global_position),"global_rotation":encode(node.global_rotation),"metadata":meta}
static func snapshot(room):
	var result={}
	for id in room.interaction_markers:
		var marker=room.interaction_markers[id]
		var entry={"body":node_snapshot(room.objects[id]),"marker":node_snapshot(marker),"approach":node_snapshot(marker.get_node(marker.get_meta("approach")))}
		if marker.has_meta("seat"): entry["seat"]=node_snapshot(marker.get_node(marker.get_meta("seat")))
		result[id]=entry
	return result

# The frozen 9368749 fixture remains immutable. Only the author-approved bed
# capability/Seat addition is normalized; every other original field stays exact.
static func validate(room) -> Array:
	var failures=[]
	var baseline=JSON.parse_string(FileAccess.get_file_as_string("res://art/tools/fixtures/interaction-contract.json"))
	var actual=JSON.parse_string(JSON.stringify(snapshot(room),"",true,true))
	if not baseline is Dictionary or actual.size()!=baseline.size():
		return ["original interaction IDs/count changed"]
	if not actual.has("bed"):
		return ["bed interaction missing"]
	var bed=actual.bed
	if bed.body.metadata.get("affordances")!=["look","sit"] or bed.marker.metadata.get("affordances")!=["look","sit"]:
		failures.append("bed must expose exactly look/sit")
	var marker=room.interaction_markers.bed
	var seat=marker.get_node_or_null("Seat")
	if seat==null:
		failures.append("bed edge Seat missing")
	else:
		if seat.position!=Vector3(.82,.375,-.20) or not is_equal_approx(seat.rotation.y,PI*.5):
			failures.append("bed edge local pose changed")
		if seat.scale!=Vector3.ONE or not is_zero_approx(seat.rotation.x) or not is_zero_approx(seat.rotation.z):
			failures.append("bed edge scale/rotation changed")
		if seat.get_meta("id","")!="bed_edge_seat" or seat.get_meta("affordances",[])!=["sit"]:
			failures.append("bed edge Seat metadata changed")
		if marker.get_meta("seat",NodePath(""))!=NodePath("Seat") or marker.get_meta("seat_position",Vector3.ZERO)!=seat.position or not is_equal_approx(marker.get_meta("seat_yaw",0.0),PI*.5):
			failures.append("bed edge parent metadata changed")
	# Strip ONLY the explicitly approved bed additions, never update the fixture.
	bed.body.metadata.affordances=baseline.bed.body.metadata.affordances
	bed.marker.metadata.affordances=baseline.bed.marker.metadata.affordances
	for key in ["seat","seat_position","seat_yaw"]: bed.marker.metadata.erase(key)
	bed.erase("seat")
	if actual!=baseline: failures.append("unapproved change to original interaction contract")
	return failures
