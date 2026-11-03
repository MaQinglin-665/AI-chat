extends SceneTree
# Bounded 60fps measurement, two CC0 Shino instances, no voice/network/player.
func _initialize():
 Engine.max_fps=60
 run.call_deferred()
func frames(count: int):
 for i in range(count):await process_frame
func percentile(values: Array,p: float):
 var copy=values.duplicate()
 copy.sort()
 return copy[mini(copy.size()-1,int(copy.size()*p))]
func run():
 var args=OS.get_cmdline_user_args()
 var profiles=["high","medium","low"] if "--low-only" not in args else ["low"]
 if "--profile" in args:profiles=[args[args.find("--profile")+1]]
 root.size=Vector2i(1280,720) if "--low-only" not in args else Vector2i(960,540)
 root.msaa_3d=Viewport.MSAA_2X if "--low-only" not in args else Viewport.MSAA_DISABLED
 var room=load("res://art/bedroom.tscn").instantiate()
 root.add_child(room)
 assert(not room.quality_art.ambience.city.playing and not room.quality_art.ambience.air.playing,"QA must set XINYU_ART_MUTE=1")
 var camera=Camera3D.new()
 room.add_child(camera)
 camera.current=true
 camera.fov=66
 camera.look_at_from_position(Vector3(1.6,1.7,3.4),Vector3(1.2,1.2,.1))
 for z in [.82,1.42]:
  var model=load("res://models/Shino.vrm").instantiate()
  room.add_child(model)
  var motion=load("res://locomotion.gd").new()
  model.add_child(motion)
  motion.configure(model)
  model.position=Vector3(3.25,0,z)
  model.rotation.y=PI*.5
 await frames(90)
 var result=[]
 RenderingServer.viewport_set_measure_render_time(root.get_viewport_rid(),true)
 for profile in profiles:
  room.set_quality_profile(profile)
  camera.look_at_from_position(Vector3(1.6,1.7,3.4),Vector3(1.2,1.2,.1))
  await frames(90)
  var times=[]
  var cpu=[]
  var gpu=[]
  var last=Time.get_ticks_usec()
  var begin=last
  for i in range(240):
   await process_frame
   if i==120:camera.look_at_from_position(Vector3(2.3,1.6,2.3),Vector3(4.25,1.2,1.1))
   var now=Time.get_ticks_usec()
   times.append((now-last)/1000.0)
   last=now
   cpu.append(RenderingServer.viewport_get_measured_render_time_cpu(root.get_viewport_rid()))
   gpu.append(RenderingServer.viewport_get_measured_render_time_gpu(root.get_viewport_rid()))
  result.append({"profile":profile,"fps":240.0*1000000/(last-begin),"frame_ms_p50":percentile(times,.5),"frame_ms_p95":percentile(times,.95),"frame_ms_p99":percentile(times,.99),"main_cpu_ms_p95":percentile(cpu,.95),"main_gpu_ms_p95":percentile(gpu,.95),"render_scale":root.scaling_3d_scale,"mirror_enabled":room.quality_art.mirror.enabled,"draw_calls":Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)})
 var report={"gpu":RenderingServer.get_video_adapter_name(),"renderer":RenderingServer.get_current_rendering_method(),"resolution":str(root.size),"cap":60,"samples_per_profile":240,"results":result}
 print("QUALITY_PERFORMANCE ",JSON.stringify(report))
 var path=args[args.find("--output")+1] if "--output" in args else "user://bedroom-performance.json"
 var file=FileAccess.open(path,FileAccess.WRITE)
 if file==null:
  push_error("Cannot write report: use an absolute --output path")
  room.free()
  quit(2)
  return
 file.store_string(JSON.stringify(report,"  "))
 file.close()
 room.free()
 await frames(3)
 quit()
