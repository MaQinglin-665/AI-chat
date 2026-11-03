@tool
extends RefCounted
# Offline model preparation. All interaction/collision nodes stay in bedroom.gd.
const ROOT="res://art/"
var g=preload("res://art/geometry.gd").new()
var linen: StandardMaterial3D
var oak: StandardMaterial3D
var plaster: StandardMaterial3D
var meshes={}

func pbr(id: String, tint: Color, meters: float, resolution: String="1k") -> StandardMaterial3D:
 var mat=StandardMaterial3D.new()
 var suffix={"wood_floor":"wood_floor","white_plaster_02":"white_plaster_02","rough_linen":"rough_linen"}[id]
 var base=ROOT+"assets/materials/"+id+"/"+suffix
 mat.albedo_texture=load(ROOT+"assets/derived/"+id+"_neutral.jpg") if id!="wood_floor" else load(base+"_diff_"+resolution+".jpg")
 mat.normal_enabled=true
 mat.normal_texture=load(base+"_nor_gl_"+resolution+".jpg")
 mat.normal_scale=.12 if id=="white_plaster_02" else .45
 mat.roughness_texture=load(ROOT+"assets/derived/wood_floor_matte.jpg") if id=="wood_floor" else load(base+"_rough_"+resolution+".jpg")
 mat.roughness_texture_channel=BaseMaterial3D.TEXTURE_CHANNEL_RED
 mat.roughness=.95
 mat.metallic_specular=.05 if id=="wood_floor" else .18
 mat.albedo_color=tint
 mat.uv1_triplanar=true
 mat.uv1_world_triplanar=true
 mat.uv1_scale=Vector3.ONE/meters
 mat.texture_filter=BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
 return mat

func remove_meshes(node: Node, keep: Array=[]):
 for child in node.get_children():
  if child is MeshInstance3D and str(child.name) not in keep:
   child.free()
  elif not child is Marker3D:
   remove_meshes(child,keep)

func fit_asset(room: Node3D,id: String,size: Vector3,pos: Vector3,yaw: float=0.0):
 var model=load(ROOT+"assets/models/"+id+"/"+id+"_1k.gltf").instantiate()
 room.add_child(model)
 var bounds=AABB()
 var first=true
 for mesh in model.find_children("*","MeshInstance3D",true,false):
  var box=model.global_transform.affine_inverse()*mesh.global_transform*mesh.get_aabb()
  bounds=box if first else bounds.merge(box)
  first=false
 var scale_value=size/bounds.size
 model.scale=scale_value
 model.position=Vector3(-bounds.get_center().x*scale_value.x,-bounds.position.y*scale_value.y,-bounds.get_center().z*scale_value.z)
 var holder=Node3D.new()
 holder.name="PH_"+id
 room.add_child(holder)
 model.reparent(holder,false)
 holder.position=pos
 holder.rotation.y=yaw
 return holder

func cloth(parent: Node3D,pos: Vector3,size: Vector2,kind: String,mat: Material) -> MeshInstance3D:
 var st=SurfaceTool.new()
 st.begin(Mesh.PRIMITIVE_TRIANGLES)
 var nx=48
 var nz=40
 var vertices=[]
 for z in range(nz+1):
  for x in range(nx+1):
   var u=float(x)/nx
   var v=float(z)/nz
   var p: Vector3
   if kind=="curtain":
    p=Vector3((u-.5)*size.x,(.5-v)*size.y,sin(u*PI*12)*.055+sin(v*PI)*.025)
   else:
    var fold=.010*sin(u*47+v*11)+.007*sin(v*56-u*9)
    p=Vector3((u-.5)*size.x,fold*sin(u*PI)*sin(v*PI),(v-.5)*size.y)
    # Soft rolled edges, while the occupied bed-edge seat remains flat.
    p.y-=.045*pow(abs(u-.5)*2,8)
   vertices.append(p)
 for z in range(nz):
  for x in range(nx):
   for i in [z*(nx+1)+x,(z+1)*(nx+1)+x,z*(nx+1)+x+1,z*(nx+1)+x+1,(z+1)*(nx+1)+x,(z+1)*(nx+1)+x+1]:
    st.set_uv(Vector2(float(i%(nx+1))/nx,float(i/(nx+1))/nz))
    st.add_vertex(vertices[i])
 st.generate_normals()
 st.generate_tangents()
 return g.mesh_node(parent,st.commit(),pos,mat,"Tailored_"+kind)

func prepare(room: Node3D):
 linen=pbr("rough_linen",Color("d7bfcf"),.24)
 linen.cull_mode=BaseMaterial3D.CULL_DISABLED
 oak=pbr("wood_floor",Color("f1d9bc"),2.4,"2k")
 plaster=pbr("white_plaster_02",Color("d8c6cb"),1.8)
 var floor=room.region.get_node("floor")
 remove_meshes(floor,["OakFloor"])
 floor.get_node("OakFloor").material_override=oak
 for name in ["BackWall","LeftWall","RightWall","FrontWall"]:
  room.region.get_node(name).get_child(1).material_override=plaster
 room.ceiling.material_override=pbr("white_plaster_02",Color("ddd3d2"),2.5)
 # Replace the major furniture with CC0 model geometry. Contract bodies remain.
 remove_meshes(room.objects.sofa)
 var sofa=fit_asset(room,"sofa_02",Vector3(2.24,.90,1.04),Vector3(-3,.015,-1))
 for mesh in sofa.find_children("*","MeshInstance3D",true,false):
  if "Seat" in str(mesh.name):mesh.material_override=linen
  else:
   var upholstery=mesh.get_active_material(0).duplicate()
   upholstery.albedo_texture=load(ROOT+"assets/derived/sofa_rose.jpg")
   upholstery.roughness=.95
   upholstery.metallic_specular=.15
   mesh.set_surface_override_material(0,upholstery)
 # Low armchairs are fitted to the existing chair seat and footprint.
 remove_meshes(room.objects.chair)
 var chair=fit_asset(room,"modern_arm_chair_01",Vector3(.63,1.02,.70),Vector3(2.4,.01,-1.95),PI)
 for mesh in chair.find_children("*","MeshInstance3D",true,false):
  for i in range(mesh.mesh.get_surface_count()):
   var mat=mesh.get_active_material(i)
   if mat and "pillow" in mat.resource_name:
    mesh.set_surface_override_material(i,linen)
 # Keep desk equipment/mug/notebook, remove only the old top and four legs.
 var desk=room.objects.desk
 var old=[]
 for child in desk.get_children():
  if child is MeshInstance3D:old.append(child)
 for i in range(5):old[i].free()
 fit_asset(room,"wooden_table_02",Vector3(1.83,.825,.88),Vector3(2.4,0,-2.9))
 # The bed keeps its approved dimensions, with PBR carved-wood finish.
 for mesh in room.objects.bed.find_children("*","MeshInstance3D",true,false):
  if mesh.material_override is ShaderMaterial:
   mesh.material_override=pbr("wood_floor",Color("e8d2b5"),.75,"2k")
 # PBR linen on bed, cushions, rug and lamp shades; manufactured details keep metal.
 for id in ["bed","rug"]:
  for mesh in room.objects[id].find_children("*","MeshInstance3D",true,false):
   var m=mesh.material_override
   if m is StandardMaterial3D and not ("DuvetBear" in str(mesh.get_path())):
    var textile=linen.duplicate()
    textile.albedo_color=m.albedo_color
    mesh.material_override=textile
 cloth(room.objects.bed,Vector3(0,.38,.24),Vector2(1.79,1.86),"duvet",linen)
 var window=room.objects.window
 # Replace the cylindrical curtain bundles with modeled pleated cloth.
 for child in window.get_children():
  if child is MeshInstance3D and child.mesh is CylinderMesh:child.free()
 var curtain=linen.duplicate()
 curtain.albedo_color=Color("d8c4cf")
 for side in [-1,1]:cloth(window,Vector3(side*1.84,-.05,.27),Vector2(.56,2.35),"curtain",curtain)
 # Original fitted upholstery pillows with seams and non-block silhouette.
 for side in [-1,1]:
  var pillow=g.box(room,Vector3(-3+side*.68,.65,-1.24),Vector3(.40,.36,.16),linen,.072,"SofaPillow")
  pillow.rotation.z=side*.15
 # Warm string lamps are emissive meshes; baked contribution needs no 23 live lights.
 for mesh in room.region.find_children("*","MeshInstance3D",true,false):
  if mesh.position.y>2.7 and mesh.mesh is SphereMesh:
   mesh.material_override=g.material("ffd29c",.6,2.4)
 # Give practical shades a PBR woven surface, with gentle emissive glow.
 for light in room.practicals:
  for child in light.get_parent().get_children():
   if child is MeshInstance3D and child.mesh is CylinderMesh and child.mesh.top_radius>.12 and child.position.y>.4:
    var shade=linen.duplicate()
    shade.albedo_color=Color("edd7b7")
    shade.emission_enabled=true
    shade.emission=Color("ffc98a")
    shade.emission_energy_multiplier=.8
    child.material_override=shade

func clone_visuals(source: Node3D, dest: Node3D):
 for child in source.get_children():
  if child is CollisionShape3D or child is Marker3D or child is WorldEnvironment or child is Light3D:continue
  if not child is Node3D:continue
  var copy: Node3D
  if child is MeshInstance3D:
   copy=child.duplicate()
   for nested in copy.get_children():nested.free()
  else:copy=Node3D.new()
  copy.name=child.name
  copy.transform=child.transform
  dest.add_child(copy)
  if not child is MeshInstance3D:clone_visuals(child,copy)

func own_recursive(node: Node,owner: Node):
 for child in node.get_children():
  child.owner=owner
  own_recursive(child,owner)

func unwrap(node: Node3D):
 var count=0
 for instance in node.find_children("*","MeshInstance3D",true,false):
  var mat=instance.material_override
  var size=instance.get_aabb().size*instance.global_basis.get_scale().abs()
  if "/desk/" in str(instance.get_path()) and instance.position.y>.5 and mat is StandardMaterial3D and mat.emission_enabled:
   # The switchable desk shade must not leave baked emission after L turns it off.
   instance.gi_mode=GeometryInstance3D.GI_MODE_DYNAMIC
   continue
  if mat is ShaderMaterial or size.length()<.16:
   instance.gi_mode=GeometryInstance3D.GI_MODE_DISABLED
   continue
  var key=str(instance.mesh.get_instance_id())+str(instance.global_basis.get_scale())
  if not meshes.has(key):
   var array=ArrayMesh.new()
   for surface in range(instance.mesh.get_surface_count()):
    array.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES,instance.mesh.surface_get_arrays(surface))
    array.surface_set_material(surface,instance.mesh.surface_get_material(surface))
   var err=array.lightmap_unwrap(Transform3D(Basis.from_scale(instance.global_basis.get_scale()),Vector3.ZERO),.07)
   assert(err==OK,"UV2 unwrap failed")
   meshes[key]=array
  instance.mesh=meshes[key]
  instance.gi_mode=GeometryInstance3D.GI_MODE_STATIC
  count+=1
 print("QUALITY_UV2_STATIC_MESHES ",count)
