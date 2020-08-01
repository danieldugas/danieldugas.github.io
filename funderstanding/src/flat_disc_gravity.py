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
CENTRIPETAL = False

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
elif shape == "flat donut":
    R = 15
    H = 1
    occ = np.logical_and.reduce([np.sqrt(xx**2 + yy**2) > 10, np.sqrt(xx**2 + yy**2) < R, np.abs(zz) < H])
elif shape == "line strip":
    L = 15
    occ = np.logical_and(abs(yy) + abs(zz) == 0, np.abs(xx) < L)
elif shape == "hollow sphere":
    r = 13
    R = 15
    rr = np.sqrt(xx**2 + yy**2 + zz**2)
    occ = np.logical_and(rr < R, rr >= r)
elif shape == "hollow cube":
    S = 10
    s = 8
    nn = np.maximum.reduce([np.abs(xx), np.abs(yy), np.abs(zz)])
    occ = np.logical_and(nn < S, nn >= s)

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

# add centripetal force ( rot around z axis )
rxy = np.sqrt(xx * xx + yy * yy)
phixy = np.arctan2(yy, xx)
omega2 = 0.25
fcr = rxy * omega2
fcx = fcr * np.cos(phixy)
fcy = fcr * np.sin(phixy)
fxfull = fx + fcx
fyfull = fy + fcy
if CENTRIPETAL:
    fx = fxfull
    fy = fyfull

# fig, axes = plt.subplots(2,2)
plt.figure()
axes = []
axes.append(plt.subplot(221))
axes.append(plt.subplot(222))
axes.append(plt.subplot(223))
axes.append(plt.subplot(224, projection='3d'))
plt.sca(axes[0])
plt.title("Front")
# 2D front (X-Z) section
gridshow(occ[:,N,:], extent=[x[0], x[-1], z[0],z[-1]])
plt.quiver(xx[:,N,:], zz[:,N,:], fx[:,N,:], fz[:,N,:])
plt.xlabel('x')
plt.ylabel('z')

plt.sca(axes[1])
plt.title("Right")
# 2D right (Y-Z) section
gridshow(occ[N,:,:], extent=[y[0], y[-1], z[0],z[-1]])
plt.quiver(yy[N,:,:], zz[N,:,:], fy[N,:,:], fz[N,:,:])
plt.xlabel('y')
plt.ylabel('z')

plt.sca(axes[2])
plt.title("Top")
# 2D top (X-Y) section
gridshow(occ[:,:,N], extent=[x[0], x[-1], y[0], y[-1]])
plt.quiver(xx[:,:,N], yy[:,:,N], fx[:,:,N], fy[:,:,N])
plt.xlabel('x')
plt.ylabel('y')

plt.sca(axes[3])
# 2D top (X-Y) section
axes[3].voxels(occ, facecolors='w', edgecolor='k')

plt.show()

# slant angle at mid-latitude
theta = np.abs(np.rad2deg(np.arctan2(np.sqrt(fx**2+fy**2), np.abs(fz))))
equator_slant = theta[27,20,21]

# slant angle at mid-latitude
edge_slant = theta[35,20,21]

fig, ax = plt.subplots()
gridshow(occ[:,:,N], extent=[x[0], x[-1], y[0], y[-1]], alpha=0.1)
CS = ax.contour(xx[:,:,21], yy[:,:,21], theta[:,:,21])
ax.clabel(CS, inline=1, fontsize=10)
plt.axis('equal')
plt.show()


# --------------------------  Other shapes -------------------
# occupied pixels
fig, axes = plt.subplots(1,3)
for shape, ax in zip(["cube", "flat donut", "hollow cube"], axes):
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
    elif shape == "flat donut":
        R = 15
        H = 1
        occ = np.logical_and.reduce([np.sqrt(xx**2 + yy**2) > 10, np.sqrt(xx**2 + yy**2) < R, np.abs(zz) < H])
    elif shape == "line strip":
        L = 15
        occ = np.logical_and(abs(yy) + abs(zz) == 0, np.abs(xx) < L)
    elif shape == "hollow sphere":
        r = 13
        R = 15
        rr = np.sqrt(xx**2 + yy**2 + zz**2)
        occ = np.logical_and(rr < R, rr >= r)
    elif shape == "hollow cube":
        S = 10
        s = 8
        nn = np.maximum.reduce([np.abs(xx), np.abs(yy), np.abs(zz)])
        occ = np.logical_and(nn < S, nn >= s)

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

    plt.sca(ax)
    # 2D front (X-Z) section
    gridshow(occ[:,N,:], extent=[x[0], x[-1], z[0],z[-1]])
    plt.quiver(xx[:,N,:], zz[:,N,:], fx[:,N,:], fz[:,N,:])
    plt.xlabel('x')
    plt.ylabel('z')
plt.show()

fig, axes = plt.subplots(1,3, subplot_kw=dict(projection="3d"))
for shape, ax in zip(["cube", "flat donut", "hollow cube"], axes):
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
    elif shape == "flat donut":
        R = 15
        H = 1
        occ = np.logical_and.reduce([np.sqrt(xx**2 + yy**2) > 10, np.sqrt(xx**2 + yy**2) < R, np.abs(zz) < H])
    elif shape == "line strip":
        L = 15
        occ = np.logical_and(abs(yy) + abs(zz) == 0, np.abs(xx) < L)
    elif shape == "hollow sphere":
        r = 13
        R = 15
        rr = np.sqrt(xx**2 + yy**2 + zz**2)
        occ = np.logical_and(rr < R, rr >= r)
    elif shape == "hollow cube":
        S = 10
        s = 8
        nn = np.maximum.reduce([np.abs(xx), np.abs(yy), np.abs(zz)])
        occ = np.logical_and(nn < S, nn >= s)
    ax.voxels(occ, facecolors='w', edgecolor='k')
plt.show()
