extends SceneTree
var failures := []
func _initialize(): verify.call_deferred()
func check(value: bool, message: String):
	if not value: failures.append(message)
func verify():
	var room=load("res://art/bedroom.tscn").instantiate()
	root.add_child(room)
	for i in range(8):await physics_frame
	check(room.ready_for_navigation,"navigation bake produced no polygons")
	check(room.interaction_markers.size()==14,"interaction count changed")
	var contract_failures=preload("res://art/tools/interaction_contract.gd").validate(room)
	for failure in contract_failures: check(false,failure)
	var floor_material=room.region.get_node("floor/OakFloor").material_override
	check(floor_material.get_shader_parameter("specular_strength")==0.0,"floor highlight regression")
	check(is_equal_approx(floor_material.get_shader_parameter("wood_roughness"),.90),"floor roughness regression")
	var map=room.region.get_navigation_map()
	NavigationServer3D.map_force_update(map)
	for i in range(3):await physics_frame
	check(NavigationServer3D.map_get_iteration_id(map)>0,"navigation server has not synchronized")
	var start=NavigationServer3D.map_get_closest_point(map,Vector3(0,0,2.8))
	var distances := {}
	var samples_checked=0
	var capsule:=CapsuleShape3D.new()
	capsule.radius=.30
	capsule.height=1.65
	var query:=PhysicsShapeQueryParameters3D.new()
	query.shape=capsule
	query.collision_mask=1
	query.margin=0.0
	var physics=room.get_world_3d().direct_space_state
	for id in room.interaction_markers:
		var marker=room.interaction_markers[id]
		check(marker is Marker3D,id+" is not a Marker3D")
		check(marker.get_meta("id")==id,id+" lacks stable metadata ID")
		check(not marker.get_meta("affordances").is_empty(),id+" lacks affordances")
		var approach=marker.get_node(marker.get_meta("approach"))
		var near=NavigationServer3D.map_get_closest_point(map,approach.global_position)
		distances[id]=near.distance_to(approach.global_position)
		check((near-approach.global_position).slide(Vector3.UP).length()<.12 and absf(near.y-approach.global_position.y)<.25,id+" approach off navigation "+str(distances[id]))
		var path=NavigationServer3D.map_get_path(map,start,near,true)
		check(not path.is_empty() and path[-1].distance_to(near)<.15,id+" approach disconnected")
		for segment in range(1,path.size()):
			var length=path[segment-1].distance_to(path[segment])
			var count=maxi(1,ceili(length/.15))
			for step in range(count+1):
				var point=path[segment-1].lerp(path[segment],float(step)/count)
				query.transform=Transform3D(Basis(),Vector3(point.x,.85,point.z))
				var hits=physics.intersect_shape(query,1)
				samples_checked+=1
				check(hits.is_empty(),id+" path capsule intersects furniture at "+str(point))
		check(not room.objects[id].find_children("*","CollisionShape3D",true,false).is_empty(),id+" lacks collision")
		if "sit" in marker.get_meta("affordances"):
			check(marker.has_meta("seat") and marker.has_meta("seat_yaw"),id+" missing seat/heading")
			check(marker.get_node(marker.get_meta("seat")) is Marker3D,id+" missing seat marker")
	for preset in ["day","dusk","night"]:
		check(room.set_lighting_preset(preset),"preset failed "+preset)
		check(room.key_light.light_energy>0 and room.fill_light.light_energy>0,"character key/fill missing")
	check(not room.set_lighting_preset("invalid") and room.lighting_preset=="night","invalid preset changed scene")
	check(room.set_quality_profile("low") and not room.key_light.shadow_enabled,"low profile shadow budget")
	check(room.set_quality_profile("balanced") and room.key_light.shadow_enabled,"balanced profile restore")
	print("ART_VERIFY ",JSON.stringify({"polygons":room.region.navigation_mesh.get_polygon_count(),"approach_offsets":distances,"capsule_samples":samples_checked,"failures":failures}))
	room.free()
	await process_frame
	quit(0 if failures.is_empty() else 1)
