extends SceneTree
const Builder=preload("res://art/quality_builder.gd")
func _initialize():
 Engine.max_fps=30
 run.call_deferred()
func run():
 var room=load("res://art/bedroom.tscn").instantiate()
 room.quality_visuals=false
 root.add_child(room)
 var builder=Builder.new()
 builder.prepare(room)
 var visual=Node3D.new()
 visual.name="QualityStatic"
 root.add_child(visual)
 builder.clone_visuals(room,visual)
 builder.unwrap(visual)
 var gi=LightmapGI.new()
 gi.name="BakedGI"
 gi.quality=LightmapGI.BAKE_QUALITY_MEDIUM
 gi.bounces=3
 gi.directional=false
 gi.max_texture_size=2048
 gi.generate_probes_subdiv=LightmapGI.GENERATE_PROBES_SUBDIV_8
 visual.add_child(gi)
 for pos in [Vector3(0,1,0),Vector3(-2.425,1.15,-.92),Vector3(-2.23,1.15,1.62),Vector3(3.2,1.1,1.1),Vector3(2.4,1.05,-1.95)]:
  var probe=LightmapProbe.new()
  probe.position=pos
  visual.add_child(probe)
 # These lights are only bake inputs; bedroom_quality hides them at runtime.
 for light in [room.key_light,room.fill_light]+room.practicals:
  var copy=light.duplicate()
  copy.name="Bake_"+str(light.get_instance_id())
  visual.add_child(copy)
  copy.global_transform=light.global_transform
  copy.light_bake_mode=Light3D.BAKE_DYNAMIC if light is DirectionalLight3D else Light3D.BAKE_STATIC
  if light==room.practicals[1]:copy.light_bake_mode=Light3D.BAKE_DISABLED
  copy.set_meta("role","key" if light==room.key_light else "fill" if light==room.fill_light else "lamp")
 var window_light=OmniLight3D.new()
 window_light.name="Bake_WindowLight"
 window_light.position=Vector3(-1.95,2.1,-3.3)
 window_light.omni_range=7
 window_light.omni_attenuation=1.3
 window_light.light_color=Color("bbc8ed")
 window_light.light_energy=.20
 window_light.light_size=.8
 window_light.light_bake_mode=Light3D.BAKE_STATIC
 window_light.set_meta("role","window")
 visual.add_child(window_light)
 var world=WorldEnvironment.new()
 world.name="BakeEnvironment"
 world.environment=room.environment.duplicate()
 visual.add_child(world)
 builder.own_recursive(visual,visual)
 var packed=PackedScene.new()
 assert(packed.pack(visual)==OK)
 assert(ResourceSaver.save(packed,"res://art/quality/bedroom-static.scn")==OK)
 room.free()
 visual.free()
 print("QUALITY_SCENE_PREPARED")
 quit()
