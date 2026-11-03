extends RefCounted
# Matching live direct light and baked indirect light for all three named periods.
static func apply(room: Node3D,period: String):
 var values={
  "night":["6c7998",.045,"f5d8bb",.27,"bac9f4",.15,1.0],
  "dusk":["b49aaa",.065,"ffcd99",.48,"c3cced",.18,.65],
  "day":["ccd8e6",.10,"ffe7c8",.68,"d3e2fa",.24,.12]
 }[period]
 room.environment.ambient_light_energy=values[1]
 room.environment.ambient_light_color=Color(values[0])
 room.key_light.light_color=Color(values[2])
 room.key_light.light_energy=values[3]
 room.key_light.light_angular_distance=6.0
 room.fill_light.light_color=Color(values[4])
 room.fill_light.light_energy=values[5]
 for lamp in room.practicals:
  lamp.light_energy=lamp.get_meta("base_energy")*values[6]
 room.environment.tonemap_mode=Environment.TONE_MAPPER_FILMIC
 room.environment.tonemap_exposure=1.0
 room.environment.adjustment_enabled=true
 room.environment.adjustment_saturation=.94
 room.environment.adjustment_contrast=1.025
 room.environment.adjustment_brightness=1.04
