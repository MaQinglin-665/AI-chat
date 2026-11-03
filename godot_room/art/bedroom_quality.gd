extends Node3D
# Art-only adapter. The original collision tree, IDs and all Marker transforms survive.
const Lighting=preload("res://art/quality_lighting.gd")
var bedroom: Node3D
var visual: Node3D
var gi: LightmapGI
var mirror: Node3D
var ambience: Node3D
var lamp_on=true
var original_scale=1.0
var pbr_materials=[]
var desk_shades=[]
var window_beam: SpotLight3D

func install(room: Node3D):
 bedroom=room
 original_scale=get_viewport().scaling_3d_scale
 name="BedroomQuality"
 for mesh in room.region.find_children("*","MeshInstance3D",true,false):mesh.hide()
 # Only the persisted visuals are baked. Physics/interaction nodes above stay intact.
 visual=load("res://art/quality/bedroom-static.scn").instantiate()
 add_child(visual)
 gi=visual.get_node("BakedGI")
 for light in visual.find_children("*","Light3D",true,false):
  if light.get_meta("role","")!="window":light.hide()
 visual.get_node("BakeEnvironment").environment=null
 for i in range(room.practicals.size()):
  room.practicals[i].light_bake_mode=Light3D.BAKE_DISABLED if i==1 else Light3D.BAKE_STATIC
 var reflection=ReflectionProbe.new()
 reflection.name="RoomPBRReflection"
 reflection.position=Vector3(0,1.5,0)
 reflection.size=Vector3(8.7,3.0,7.7)
 reflection.interior=true
 reflection.box_projection=true
 reflection.enable_shadows=false
 reflection.cull_mask=0xFFFFF^(1<<18)
 reflection.update_mode=ReflectionProbe.UPDATE_ONCE
 add_child(reflection)
 # A soft high-profile volumetric window cone, entirely owned by the art scene.
 window_beam=SpotLight3D.new()
 window_beam.name="SubtleWindowBeam"
 window_beam.position=Vector3(-1.95,2.5,-3.35)
 window_beam.spot_range=4.2
 window_beam.spot_angle=22
 window_beam.light_color=Color("b9c8ed")
 window_beam.light_volumetric_fog_energy=1.3
 window_beam.shadow_enabled=false
 add_child(window_beam)
 window_beam.look_at(Vector3(-.7,.4,-.7))
 # Keep shared imported resources immutable across room instances.
 var copies={}
 for mesh in visual.find_children("*","MeshInstance3D",true,false):
  for surface in range(mesh.mesh.get_surface_count()):
   var material=mesh.get_active_material(surface)
   if material is StandardMaterial3D and material.normal_enabled:
    var id=material.get_instance_id()
    if not copies.has(id):
     copies[id]=material.duplicate()
     pbr_materials.append(copies[id])
    if mesh.material_override:mesh.material_override=copies[id]
    else:mesh.set_surface_override_material(surface,copies[id])
 for mesh in visual.get_node("WalkableRoom/desk").find_children("*","MeshInstance3D",true,false):
  var material=mesh.get_active_material(0)
  if mesh.position.y>.5 and material is StandardMaterial3D and material.emission_enabled:desk_shades.append(material)
 var window=visual.find_child("NightSky",true,false)
 if window:bedroom.window_material=window.material_override
 mirror=preload("res://art/planar_mirror.gd").new()
 add_child(mirror)
 ambience=preload("res://art/room_ambience.gd").new()
 add_child(ambience)

func set_period(period: String):
 Lighting.apply(bedroom,period)
 window_beam.light_energy={"day":.5,"dusk":.28,"night":.18}[period]
 visual.get_node("Bake_WindowLight").light_energy={"day":1.8,"dusk":.85,"night":.20}[period]
 var path="res://art/quality/"+period+".lmbake"
 if ResourceLoader.exists(path):gi.light_data=load(path)
 if not lamp_on:bedroom.practicals[1].light_energy=0
 ambience.set_period(period)

func set_quality(profile: String):
 var env=bedroom.environment
 # Mobile low trades internal 3D resolution/normal detail for frame pacing;
 # 2D/chat resolution stays native, and removing the art restores the host scale.
 get_viewport().scaling_3d_scale=original_scale*(.70 if profile=="low" else 1.0)
 for material in pbr_materials:material.normal_enabled=profile!="low"
 var forward=RenderingServer.get_current_rendering_method()=="forward_plus"
 env.glow_enabled=profile!="low"
 env.glow_intensity=.40
 env.glow_bloom=.035
 env.glow_hdr_threshold=1.15
 env.ssao_enabled=profile!="low" and forward
 env.ssao_radius=.5
 env.ssao_intensity=.9
 env.ssao_light_affect=.15
 env.ssil_enabled=profile=="high" and forward
 env.ssil_intensity=.35
 # A subtle single-scattering night haze, disabled on medium/Mobile.
 env.volumetric_fog_enabled=profile=="high" and forward
 window_beam.visible=profile=="high" and forward
 env.volumetric_fog_density=.006
 env.volumetric_fog_albedo=Color("ccbaca")
 mirror.set_quality(profile)

func _unhandled_key_input(event: InputEvent):
 if not event is InputEventKey or not event.pressed or event.echo:return
 var focus=get_viewport().gui_get_focus_owner()
 if focus is LineEdit or focus is TextEdit:return
 if event.physical_keycode==KEY_F6:
  var periods=["day","dusk","night"]
  bedroom.set_lighting_preset(periods[(periods.find(bedroom.lighting_preset)+1)%3])
  get_viewport().set_input_as_handled()
 if event.physical_keycode==KEY_F7:
  var profiles=["high","medium","low"]
  bedroom.set_quality_profile(profiles[(profiles.find(bedroom.quality_profile)+1)%3])
  get_viewport().set_input_as_handled()
 if event.physical_keycode==KEY_F8:
  mirror.set_enabled(not mirror.enabled)
  get_viewport().set_input_as_handled()
 if event.physical_keycode==KEY_L:
  lamp_on=not lamp_on
  var lamp=bedroom.practicals[1]
  lamp.light_energy=lamp.get_meta("base_energy")*({"day":.12,"dusk":.65,"night":1.0}[bedroom.lighting_preset]) if lamp_on else 0.0
  for shade in desk_shades:shade.emission_energy_multiplier=.8 if lamp_on else 0.0
  ambience.click()
  get_viewport().set_input_as_handled()

func _exit_tree():
 if is_inside_tree():get_viewport().scaling_3d_scale=original_scale
