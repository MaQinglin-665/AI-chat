extends Node3D
# Off-axis planar reflection of the SAME World3D, including both live avatars.
# One reflected render, clipped at the mirror plane; this surface is excluded.
var enabled=true
var viewport: SubViewport
var camera: Camera3D
var plane: MeshInstance3D
var material=ShaderMaterial.new()
var elapsed=0.0
var interval=.1
var profile="medium"
const MIRROR_LAYER=1<<18
const SIZE=Vector2(1.12,2.25)

func _ready():
 name="PlanarMirror"
 var g=preload("res://art/geometry.gd").new()
 position=Vector3(4.36,1.43,1.12)
 rotation.y=-PI*.5
 # The wall already supplies collision; do not add a navigation obstacle or Marker.
 for side in [-1,1]:
  g.box(self,Vector3(side*.60,0,0),Vector3(.065,2.39,.075),g.material("b38d65",.26),.018)
  g.box(self,Vector3(0,side*1.16,0),Vector3(1.26,.065,.075),g.material("b38d65",.26),.018)
 viewport=SubViewport.new()
 viewport.name="ReflectionViewport"
 viewport.size=Vector2i(384,768)
 viewport.own_world_3d=false
 viewport.world_3d=get_world_3d()
 viewport.render_target_update_mode=SubViewport.UPDATE_DISABLED
 viewport.audio_listener_enable_3d=false
 viewport.positional_shadow_atlas_size=1024
 add_child(viewport)
 camera=Camera3D.new()
 camera.cull_mask=0xFFFFF^MIRROR_LAYER
 camera.keep_aspect=Camera3D.KEEP_HEIGHT
 viewport.add_child(camera)
 camera.current=true
 var quad=QuadMesh.new()
 quad.size=SIZE
 material.shader=preload("res://art/mirror.gdshader")
 material.set_shader_parameter("reflection_tex",viewport.get_texture())
 plane=g.mesh_node(self,quad,Vector3(0,0,.012),material,"MirrorSurface")
 plane.layers=MIRROR_LAYER
 plane.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
 plane.gi_mode=GeometryInstance3D.GI_MODE_DISABLED

func set_enabled(value: bool):
 enabled=value
 if material:material.set_shader_parameter("enabled",false)
 if viewport:viewport.render_target_update_mode=SubViewport.UPDATE_DISABLED
 elapsed=interval

func set_quality(value: String):
 profile=value
 if viewport:
  viewport.size={"high":Vector2i(512,1024),"medium":Vector2i(384,768),"low":Vector2i(192,384)}[value]
 interval={"high":1.0/15,"medium":.1,"low":.2}[value]
 # Low disables reflection by default; F8 still opts in explicitly.
 set_enabled(value!="low")

func _process(delta: float):
 if not enabled or not plane or not is_visible_in_tree():return
 if not get_window().visible or get_window().mode==Window.MODE_MINIMIZED:return
 elapsed+=delta
 if elapsed<interval:return
 elapsed=0
 var viewer=get_viewport().get_camera_3d()
 if not viewer or not viewer.is_position_in_frustum(global_position):return
 var normal=global_basis.z.normalized()
 var up=global_basis.y.normalized()
 var right=global_basis.x.normalized()
 var center=plane.global_position
 var distance=normal.dot(viewer.global_position-center)
 if distance<.08 or distance>6.0:return
 var eye=viewer.global_position-2.0*normal*distance
 camera.global_transform=Transform3D(Basis(-right,up,-normal),eye)
 var local_center=camera.to_local(center)
 var near=distance+.004
 var scale_near=near/distance
 camera.set_frustum(SIZE.y*scale_near,Vector2(local_center.x,local_center.y)*scale_near,near,40.0)
 viewport.render_target_update_mode=SubViewport.UPDATE_ONCE
 material.set_shader_parameter("enabled",true)

func _exit_tree():
 if material:material.set_shader_parameter("reflection_tex",null)
