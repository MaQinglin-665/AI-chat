extends RefCounted
# Original reusable low-poly geometry. No external textures or meshes.
var meshes := {}
var materials := {}

func material(hex: String, roughness := .8, glow := 0.0) -> StandardMaterial3D:
	var key = hex + str(roughness) + str(glow)
	if materials.has(key): return materials[key]
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(hex)
	mat.roughness = roughness
	if glow > 0:
		mat.emission_enabled = true
		mat.emission = Color(hex)
		mat.emission_energy_multiplier = glow
	materials[key] = mat
	return mat

func wood(hex := "96705b") -> ShaderMaterial:
	var key = "wood" + hex
	if materials.has(key): return materials[key]
	var mat := ShaderMaterial.new()
	mat.shader = preload("res://art/wood.gdshader")
	mat.set_shader_parameter("tint", Color(hex))
	materials[key] = mat
	return mat

func mesh_node(parent: Node3D, mesh: Mesh, pos: Vector3, mat: Material, label := "Detail") -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = label
	node.mesh = mesh
	node.material_override = mat
	node.position = pos
	parent.add_child(node)
	return node

func rounded_mesh(size: Vector3, radius: float) -> ArrayMesh:
	var key = str(size) + ":" + str(radius)
	if meshes.has(key): return meshes[key]
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var half = size * .5
	var inner = half - Vector3.ONE * radius
	for axis in range(3):
		var u = (axis + 1) % 3
		var v = (axis + 2) % 3
		var us = [-half[u], -inner[u]-radius*.5, -inner[u], inner[u], inner[u]+radius*.5, half[u]]
		var vs = [-half[v], -inner[v]-radius*.5, -inner[v], inner[v], inner[v]+radius*.5, half[v]]
		for sign_value in [-1, 1]:
			for a in range(us.size()-1):
				for b in range(vs.size()-1):
					var points := []
					for uv in [Vector2(us[a],vs[b]),Vector2(us[a+1],vs[b]),Vector2(us[a+1],vs[b+1]),Vector2(us[a],vs[b+1])]:
						var p := Vector3.ZERO
						p[axis] = half[axis] * sign_value
						p[u] = uv.x
						p[v] = uv.y
						var core = p.clamp(-inner, inner)
						var normal = (p-core).normalized()
						points.append([core+normal*radius,normal,Vector2(uv.x/size[u]+.5,uv.y/size[v]+.5)])
					var indices = [0,2,1,0,3,2] if sign_value > 0 else [0,1,2,0,2,3]
					for index in indices:
						surface.set_normal(points[index][1])
						surface.set_uv(points[index][2])
						surface.add_vertex(points[index][0])
	var result = surface.commit()
	meshes[key] = result
	return result

func box(parent: Node3D, pos: Vector3, size: Vector3, mat: Material, radius := .025, label := "Detail") -> MeshInstance3D:
	radius = minf(radius, minf(size.x,minf(size.y,size.z))*.45)
	return mesh_node(parent,rounded_mesh(size,radius),pos,mat,label)

func cylinder(parent: Node3D, pos: Vector3, bottom: float, top: float, height: float, mat: Material) -> MeshInstance3D:
	var key = "cyl" + str([bottom,top,height])
	if not meshes.has(key):
		var mesh := CylinderMesh.new()
		mesh.bottom_radius = bottom
		mesh.top_radius = top
		mesh.height = height
		mesh.radial_segments = 20
		meshes[key] = mesh
	return mesh_node(parent,meshes[key],pos,mat)

func sphere(parent: Node3D, pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	if not meshes.has("sphere"):
		var mesh := SphereMesh.new()
		mesh.radius = .5
		mesh.height = 1.0
		mesh.radial_segments = 20
		mesh.rings = 10
		meshes["sphere"] = mesh
	var node = mesh_node(parent,meshes.sphere,pos,mat)
	node.scale = size
	return node

func collision(parent: StaticBody3D, pos: Vector3, size: Vector3):
	var shape := BoxShape3D.new()
	shape.size = size
	var node := CollisionShape3D.new()
	node.shape = shape
	node.position = pos
	parent.add_child(node)

func leaf(parent: Node3D, pos: Vector3, size: Vector3, rotation: Vector3, mat: Material):
	var node = sphere(parent,pos,size,mat)
	node.rotation_degrees = rotation
	return node
