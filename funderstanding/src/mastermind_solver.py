import numpy as np

colorid_to_color = ['R', 'G', 'B', 'Y', 'W', 'K']
color_to_colorid = {
    'R': 0,
    'G': 1,
    'B': 2,
    'Y': 3,
    'W': 4,
    'K': 5,
}

def idseq_to_colorseq(idseq):
    return "{}{}{}{}".format(*[colorid_to_color[c] for c in idseq])

def colorseq_to_idseq(colorseq):
    return np.array([color_to_colorid[char] for char in colorseq])


n_colors = len(colorid_to_color)

groundtruth_x = np.array(np.where(np.ones((n_colors, n_colors, n_colors, n_colors)))).T
groundtruth_count = np.sum(groundtruth_x[:,:,None] == np.arange(6)[None,None,:], axis=1)
n_permutations = len(groundtruth_x)

# fill the question to answer matrix
# [guess, truth, answer (black, white)]
q_to_a_black = np.sum(groundtruth_x[:,None] == groundtruth_x[None, :], axis=-1)
q_to_a_goodcolors = np.sum(np.minimum(groundtruth_count[:,None], groundtruth_count[None,:]), axis=-1)
q_to_a_white = q_to_a_goodcolors - q_to_a_black

# pre-guess first iteration
# groundtruth_prob = np.ones((len(groundtruth_x),))
starting_avg_n_elimination = np.mean(np.sum(np.logical_or(
    q_to_a_black[:,:,None] != q_to_a_black[:,None,:],
    q_to_a_white[:,:,None] != q_to_a_white[:,None,:]
), axis=-1), axis=-1)
starting_best_guesses = np.where(starting_avg_n_elimination == np.max(starting_avg_n_elimination))[0]
starting_best_avg_n_elimination = starting_avg_n_elimination[starting_best_guesses]

def play_game(solution=None):
    """ solution:
            None -> interactive game
            string (e.g. 'RRGB')
    """
    if solution is not None:
        solution_i = np.where(np.all(colorseq_to_idseq(solution) == groundtruth_x, axis=-1))[0][0]
    groundtruth_prob = np.ones((len(groundtruth_x),))
    iteration = 0
    while True:
        iteration += 1
        # only one possibility
        if np.sum(groundtruth_prob) == 1:
            final_guess_i = np.where(groundtruth_prob)[0][0]
            final_guess = idseq_to_colorseq(groundtruth_x[final_guess_i])
            print("FINAL GUESS:")
            print(final_guess)
            break
        # find best guess
        if iteration != 1:
            best_avg_n_elimination = 0
            best_guesses = []
            for i in range(n_permutations):
                if groundtruth_prob[i] == 0:
                    continue
                n_elimination_per_truth = []
                for j in range(n_permutations):
                    if groundtruth_prob[j] == 0:
                        continue
                    n_elimination = np.sum(np.logical_and(
                        np.logical_or(
                            q_to_a_black[i,j] != q_to_a_black[i,:],
                            q_to_a_white[i,j] != q_to_a_white[i,:]
                        ),  # doesn't match answer to guess
                        groundtruth_prob > 0  # still possible
                    ))
                    n_elimination_per_truth.append(n_elimination)
                avg_n_elimination = np.mean(n_elimination_per_truth)
                if avg_n_elimination > best_avg_n_elimination:
                    best_guesses = [i]
                if avg_n_elimination == best_avg_n_elimination:
                    best_guesses.append(i)
                if avg_n_elimination >= best_avg_n_elimination:
                    best_avg_n_elimination = avg_n_elimination
        else:
            best_avg_n_elimination = starting_best_avg_n_elimination
            best_guesses = starting_best_guesses

        print("{} remaining possibilities:".format(int(np.sum(groundtruth_prob))))
        print(groundtruth_x[np.where(groundtruth_prob)])
        print("best guesses: ")
        print(groundtruth_x[best_guesses])
        print("best avg_n_elimination")
        print(best_avg_n_elimination)

        guess_i = best_guesses[0]
        guess = idseq_to_colorseq(groundtruth_x[guess_i])

        print("guess:")
        print(guess)

        if solution is None:
            print("Enter answer")
            print("------------")
            n_black = int(input("n_black:"))
            n_white = int(input("n_white:"))
        else:
            n_black = q_to_a_black[guess_i, solution_i]
            n_white = q_to_a_white[guess_i, solution_i]

        if n_black == 4:
            break

        # update probabilities
        eliminations = np.logical_and(
            np.logical_or(
                n_black != q_to_a_black[guess_i,:],
                n_white != q_to_a_white[guess_i,:]
            ),  # doesn't match answer to guess
            groundtruth_prob > 0  # still possible
        )
        print("eliminated {} possibilities".format(np.sum(eliminations)))
        groundtruth_prob[eliminations] = 0

    return iteration


if __name__ == "__main__":
    play_game()
