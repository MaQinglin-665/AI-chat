extends SceneTree
# Offline public-Shino-only QA. No player, bridge, voice or backend.
var room
var model
var motion
var camera=Camera3D.new()
var output="res://art/docs/polish/"
func _initialize():
	Engine.max_fps=30
	run.call_deferred()
func frames(count: int):
	for i in range(count): await process_frame
	await RenderingServer.frame_post_draw
func shot(name: String):
	await frames(15)
	root.get_texture().get_image().save_png(output+name+".png")
	print("REVIEW_SHOT ",name)
func sit_at(seat: Transform3D):
	model.position=Vector3(seat.origin.x,0,seat.origin.z)
	model.rotation.y=seat.basis.get_euler().y
	motion.playback.start("Sitting_Idle")
	await frames(45)
	var skeleton=model.find_children("*","Skeleton3D",true,false)[0]
	var hips=skeleton.to_global(skeleton.get_bone_global_pose(skeleton.find_bone("Hips")).origin)
	model.position.y+=seat.origin.y+.08-hips.y
	await frames(15)
func run():
	var args=OS.get_cmdline_user_args()
	var phase=args[0] if args.size()>0 else "after"
	if phase not in ["before","after"]:
		quit(1)
		return
	root.size=Vector2i(1280,720)
	root.msaa_3d=Viewport.MSAA_2X
	room=load("res://art/bedroom.tscn").instantiate()
	root.add_child(room)
	room.set_lighting_preset("night")
	if phase=="before":
		# Recreate ONLY the throw's e3013b0 dimensions for a controlled comparison.
		# This is not a screenshot of the complete historic scene.
		var sofa=room.objects.sofa
		for node in sofa.get_children():
			if str(node.name).begins_with("Throw"): node.hide()
		room.g.box(sofa,Vector3(.67,.27,.30),Vector3(.44,.045,.43),room.g.material("ad7890"),.015,"OldThrowTop")
		room.g.box(sofa,Vector3(.67,.07,.50),Vector3(.44,.38,.045),room.g.material("ad7890"),.015,"OldThrowFront")
		for i in range(8):
			room.g.box(sofa,Vector3(.49+i*.05,-.15,.51),Vector3(.012,.11,.014),room.g.material("c29ab0"),.005,"OldThrowFringe"+str(i))
	model=load("res://models/Shino.vrm").instantiate()
	room.add_child(model)
	motion=load("res://locomotion.gd").new()
	model.add_child(motion)
	motion.configure(model)
	room.add_child(camera)
	camera.current=true
	camera.fov=50
	var marker=room.interaction_markers.sofa
	var seat: Transform3D=marker.get_node(marker.get_meta("seat")).global_transform
	# Same +width/4 offset as room.seat_for(sofa, Companion), right cushion.
	seat.origin+=seat.basis.x*2.30*.25
	await sit_at(seat)
	camera.look_at_from_position(Vector3(-2.55,1.15,.45),Vector3(-2.65,.58,-.95))
	camera.fov=70
	await shot("review-"+phase+"-sofa-right")
	if not check_shins(phase):
		room.free()
		await process_frame
		quit(1)
		return
	if phase=="after":
		camera.fov=50
		camera.look_at_from_position(Vector3(-.75,1.35,.25),Vector3(-2.65,.65,-.9))
		await shot("review-after-sofa-right-angle")
		var bed=room.interaction_markers.bed
		var bed_seat: Transform3D=bed.get_node(bed.get_meta("seat")).global_transform
		# Same shared-seat offset as room.seat_for(bed, Companion).
		bed_seat.origin+=bed_seat.basis.x*1.85*.25
		await sit_at(bed_seat)
		camera.look_at_from_position(Vector3(.1,1.65,3.35),Vector3(-2.65,.85,1.7))
		await shot("review-after-bed-seat")
	room.free()
	await process_frame
	quit()

func check_shins(phase: String) -> bool:
	var skeleton=model.find_children("*","Skeleton3D",true,false)[0]
	var minimum=INF
	for side in ["Left","Right"]:
		var start=skeleton.to_global(skeleton.get_bone_global_pose(skeleton.find_bone(side+"LowerLeg")).origin)
		var end=skeleton.to_global(skeleton.get_bone_global_pose(skeleton.find_bone(side+"Foot")).origin)
		for node in room.objects.sofa.get_children():
			if not node is MeshInstance3D or not node.visible: continue
			if not ("Throw" in str(node.name)): continue
			var box: AABB=node.global_transform*node.get_aabb()
			for i in range(33):
				var point=start.lerp(end,float(i)/32)
				minimum=minf(minimum,point.distance_to(point.clamp(box.position,box.end))-.06)
	print("SHIN_THROW_CLEARANCE ",phase," ",minimum)
	if phase=="after" and (not is_finite(minimum) or minimum<=0):
		push_error("throw intersects 6cm shin envelope")
		return false
	return true
