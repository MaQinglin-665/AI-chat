extends SceneTree
# Silent, isolated art QA. No player, bridge, audio or network.
func _initialize():
 Engine.max_fps=30
 run.call_deferred()
func frames(count: int):
 for i in range(count): await process_frame
 await RenderingServer.frame_post_draw
func run():
 var args=OS.get_cmdline_user_args()
 var phase="after"
 var mirror_only="--mirror-only" in args
 if args.size()>0 and not mirror_only:
  push_error("This captures the current artwork only; frozen before images must not be overwritten.")
  quit(1)
  return
 var output="res://art/docs/quality/"
 DirAccess.make_dir_recursive_absolute(output)
 root.size=Vector2i(1280,720)
 root.msaa_3d=Viewport.MSAA_2X
 var room=load("res://art/bedroom.tscn").instantiate()
 root.add_child(room)
 var model=load("res://models/Shino.vrm").instantiate()
 room.add_child(model)
 var motion=load("res://locomotion.gd").new()
 model.add_child(motion)
 motion.configure(model)
 var camera=Camera3D.new()
 room.add_child(camera)
 camera.fov=50
 camera.current=true
 camera.look_at_from_position(Vector3(0,1.7,3.65),Vector3(0,.95,0))
 for preset in ([] if mirror_only else ["day","dusk","night"]):
  room.set_lighting_preset(preset)
  await frames(40)
  root.get_texture().get_image().save_png(output+phase+"-"+preset+".png")
  print("POLISH_SHOT ",phase,"-",preset)
 if not mirror_only:
  room.set_quality_profile("high")
  camera.fov=68
  camera.look_at_from_position(Vector3(2.3,2.0,3.45),Vector3(-1.3,1.05,-.2))
  await frames(45)
  root.get_texture().get_image().save_png(output+"after-high-wide.png")
  room.set_quality_profile("medium")
  var seat: Transform3D=room.interaction_markers.sofa.get_node("Seat").global_transform
  seat.origin+=seat.basis.x*2.30*.25
  model.position=Vector3(seat.origin.x,0,seat.origin.z)
  model.rotation.y=seat.basis.get_euler().y
  motion.playback.start("Sitting_Idle")
  await frames(45)
  var skeleton=model.find_children("*","Skeleton3D",true,false)[0]
  var hips=skeleton.to_global(skeleton.get_bone_global_pose(skeleton.find_bone("Hips")).origin)
  model.position.y+=seat.origin.y+.08-hips.y
  camera.fov=60
  camera.look_at_from_position(Vector3(-.55,1.6,.4),Vector3(-2.8,.8,-1))
  await frames(30)
  root.get_texture().get_image().save_png(output+"after-sofa.png")
 var user_model=load("res://models/Shino.vrm").instantiate()
 room.add_child(user_model)
 user_model.position=Vector3(3.3,0,.81)
 user_model.rotation.y=PI*.5
 var user_motion=load("res://locomotion.gd").new()
 user_model.add_child(user_motion)
 user_motion.configure(user_model)
 model.position=Vector3(3.3,0,1.45)
 model.rotation.y=PI*.5
 motion.playback.start("Idle")
 camera.fov=62
 camera.look_at_from_position(Vector3(1.9,1.6,1.12),Vector3(4.3,1.3,1.12))
 await frames(50)
 root.get_texture().get_image().save_png(output+"after-mirror-two.png")
 user_model.hide()
 model.position.z=1.12
 camera.look_at_from_position(Vector3(2.6,1.6,2.3),Vector3(4.3,1.3,1.1))
 await frames(25)
 root.get_texture().get_image().save_png(output+"after-mirror.png")
 room.free()
 await process_frame
 quit()
