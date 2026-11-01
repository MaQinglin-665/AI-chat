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
