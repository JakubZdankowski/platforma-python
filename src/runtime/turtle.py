"""Educational browser Turtle.

Functions only validate arguments and emit structured drawing commands.
State and rendering belong to the JavaScript TurtleEngine.
"""

import json as _json
import math as _math
import re as _re
import sys as _sys

__all__ = [
    "forward", "fd", "backward", "back", "bk", "left", "lt", "right", "rt",
    "goto", "setheading", "seth", "circle", "color", "pencolor", "pensize", "width",
    "penup", "pu", "up", "pendown", "pd", "down", "home", "clear",
    "hideturtle", "ht", "showturtle", "st", "speed", "done", "mainloop",
]

_COLOR_NAMES = frozenset("""
aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown
burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan
darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid
darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet
deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro
ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki
lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow
lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray
lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine
mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen
mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace
olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred
papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue
saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey
snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow
yellowgreen
""".split())
_HEX_COLOR = _re.compile(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})")


class TurtleGraphicsError(Exception):
    pass


_send = None
_limit = 0
_count = 0
_truncated = False


def _configure(send, limit):
    global _send, _limit
    _send = send
    _limit = limit


def _emit(command):
    """Sends each command at once, so the worker knows its order relative to print()."""
    global _count, _truncated
    if _truncated or _send is None:
        return
    if _count >= _limit:
        _truncated = True
        _send('{"type":"truncated"}')
        return
    _count += 1
    # Text printed before this command must reach the worker first.
    _sys.stdout.flush()
    _sys.stderr.flush()
    _send(_json.dumps(command, separators=(",", ":")))


def _number(function, name, value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError(f"{function}() argument '{name}' must be a number, not {type(value).__name__!r}")
    number = float(value)
    if not _math.isfinite(number):
        raise ValueError(f"{function}() argument '{name}' must be a finite number")
    return number


def forward(distance):
    _emit({"type": "forward", "distance": _number("forward", "distance", distance)})


def backward(distance):
    _emit({"type": "backward", "distance": _number("backward", "distance", distance)})


def left(angle):
    _emit({"type": "left", "angle": _number("left", "angle", angle)})


def right(angle):
    _emit({"type": "right", "angle": _number("right", "angle", angle)})


def goto(x, y):
    _emit({"type": "goto", "x": _number("goto", "x", x), "y": _number("goto", "y", y)})


def setheading(angle):
    _emit({"type": "setheading", "angle": _number("setheading", "angle", angle)})


def circle(radius, extent=None):
    _emit({
        "type": "circle",
        "radius": _number("circle", "radius", radius),
        "extent": 360.0 if extent is None else _number("circle", "extent", extent),
    })


def color(name):
    if not isinstance(name, str):
        raise TypeError(f"color() argument must be a colour name such as 'red', not {type(name).__name__!r}")
    value = name.strip().lower()
    if value not in _COLOR_NAMES and not _HEX_COLOR.fullmatch(value):
        raise TurtleGraphicsError(f"bad color string: {name!r}")
    _emit({"type": "color", "color": value})


def pensize(width):
    value = _number("pensize", "width", width)
    if value < 0:
        raise ValueError("pensize() argument 'width' must not be negative")
    _emit({"type": "pensize", "width": value})


def penup():
    _emit({"type": "penup"})


def pendown():
    _emit({"type": "pendown"})


def home():
    _emit({"type": "home"})


def clear():
    _emit({"type": "clear"})


def hideturtle():
    _emit({"type": "hideturtle"})


def showturtle():
    _emit({"type": "showturtle"})


def speed(speed=None):
    """Accepted for compatibility; the speed is set with the slider above the drawing."""


def done():
    """Accepted for compatibility; the drawing stays visible after the program ends."""


mainloop = done
fd = forward
back = bk = backward
lt = left
rt = right
seth = setheading
pencolor = color
width = pensize
pu = up = penup
pd = down = pendown
ht = hideturtle
st = showturtle
