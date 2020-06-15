import numpy as np

from solver import groundtruth_x, play_game, idseq_to_colorseq

n_iters = []
for x in groundtruth_x:
    solution = idseq_to_colorseq(x)
    n_iter = play_game(solution)
    n_iters.append(n_iter)
for x, n_iter in zip(groundtruth_x, n_iters):
    solution = idseq_to_colorseq(x)
    print(n_iter, solution)

print("Mean number of guesses: {}".format(np.mean(n_iters)))
print("Max number of guesses: {}".format(np.max(n_iters)))
