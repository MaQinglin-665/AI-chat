extends SceneTree
func _initialize():
	var file=FileAccess.open(OS.get_environment("ROOM_ENGINE_NOTICES"),FileAccess.WRITE)
	if file==null:
		quit(1)
		return
	file.store_line(Engine.get_license_text())
	for item in Engine.get_copyright_info():
		file.store_line(JSON.stringify(item))
	var licenses=Engine.get_license_info()
	for name in licenses:
		file.store_line(name+"\n"+licenses[name])
	file.close()
	quit()
