extends Node3D
# Original procedural recordings, dedicated CC0; offline. QA explicitly mutes all.
var city=AudioStreamPlayer3D.new()
var air=AudioStreamPlayer.new()
var switch=AudioStreamPlayer.new()
func _ready():
 name="QuietAmbience"
 add_child(city)
 city.position=Vector3(-1.95,1.9,-3.7)
 city.stream=load("res://art/audio/city.wav")
 city.stream.loop_mode=AudioStreamWAV.LOOP_FORWARD
 city.stream.loop_end=int(city.stream.get_length()*city.stream.mix_rate)
 city.volume_db=-35
 city.unit_size=3.0
 city.max_distance=12
 add_child(air)
 air.stream=load("res://art/audio/air.wav")
 air.stream.loop_mode=AudioStreamWAV.LOOP_FORWARD
 air.stream.loop_end=int(air.stream.get_length()*air.stream.mix_rate)
 air.volume_db=-44
 add_child(switch)
 switch.stream=load("res://art/audio/lamp-click.wav")
 switch.volume_db=-28
 if OS.get_environment("XINYU_ART_MUTE")!="1":
  city.play()
  air.play()
func set_period(period: String):
 city.volume_db=-35 if period=="night" else -41
func click():
 if OS.get_environment("XINYU_ART_MUTE")!="1":switch.play()
