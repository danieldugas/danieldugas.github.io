from __future__ import print_function

import numpy as np
from matplotlib import pyplot as plt
from pyniel.pyplot_tools.plot import gridshow

""" Visualizing 3D gravity fields for arbitrary voxel shapes

What does the gravity field on a flat disc look like?
am I attracted to the disc C.O.G wherever I go?
Or to the disc surface, like if I was wearing magnetic boots?
Which one and why?
"""

shape = "flat disc"

# create space
N = 20
x = np.arange(-N, N)
y = np.arange(-N, N)
z = np.arange(-N, N)
yy, xx, zz = np.meshgrid(y, x, z)

# cosmological constants
G = 1
# all pixel weights = 1

# occupied pixels
if shape == "cube":
    L = 5
    occ = np.logical_and.reduce([np.abs(xx) < L, np.abs(yy) < L, np.abs(zz) < L])
elif shape == "flat square":
    L = 15
    H = 1
    occ = np.logical_and.reduce([np.abs(xx) < L, np.abs(yy) < L, np.abs(zz) < H])
elif shape == "flat disc":
    R = 15
    H = 1
    occ = np.logical_and(np.sqrt(xx**2 + yy**2) < R, np.abs(zz) < H)
elif shape == "line strip":
    L = 15
    occ = np.logical_and(abs(yy) + abs(zz) == 0, np.abs(xx) < L)
elif shape == "hollow sphere":
    r = 13
    R = 15
    rr = np.sqrt(xx**2 + yy**2 + zz**2)
    occ = np.logical_and(rr < R, rr >= r)

oi, oj, ok = np.where(occ)
ox = x[oi]
oy = y[oj]
oz = z[ok]


# force from each pixel to each other pixel
dx = ox[None,None,None,:] - xx[:,:,:,None]
dy = oy[None,None,None,:] - yy[:,:,:,None]
dz = oz[None,None,None,:] - zz[:,:,:,None]
d = np.sqrt(dx * dx + dy * dy + dz * dz)
d[d == 0] = np.inf
fx = dx / d * G / d**2
fy = dy / d * G / d**2
fz = dz / d * G / d**2
fx = np.sum(fx, axis=-1)
fy = np.sum(fy, axis=-1)
fz = np.sum(fz, axis=-1)

fig, axes = plt.subplots(2,2)
plt.sca(axes[0,0])
plt.title("Front")
# 2D front (X-Z) section
gridshow(occ[:,N,:], extent=[x[0], x[-1], z[0],z[-1]])
plt.quiver(xx[:,N,:], zz[:,N,:], fx[:,N,:], fz[:,N,:])
plt.xlabel('x')
plt.ylabel('z')

plt.sca(axes[0,1])
plt.title("Right")
# 2D right (Y-Z) section
gridshow(occ[N,:,:], extent=[y[0], y[-1], z[0],z[-1]])
plt.quiver(yy[N,:,:], zz[N,:,:], fy[N,:,:], fz[N,:,:])
plt.xlabel('y')
plt.ylabel('z')

plt.sca(axes[1,0])
plt.title("Top")
# 2D top (X-Y) section
gridshow(occ[:,:,N], extent=[x[0], x[-1], y[0], y[-1]])
plt.quiver(xx[:,:,N], yy[:,:,N], fx[:,:,N], fy[:,:,N])
plt.xlabel('x')
plt.ylabel('y')

fig.delaxes(ax=axes[1,1])
plt.show()

# slant angle at mid-latitude
equator_slant = np.arctan2(fx[27,20,21], fz[27,20,21]) * 180 / np.pi + 180

# slant angle at mid-latitude
edge_slant = np.arctan2(fx[35,20,21], fz[35,20,21]) * 180 / np.pi + 180
