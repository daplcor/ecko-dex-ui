import React, { createContext, useState } from 'react';

export const GameEditionContext = createContext(null);

const initialModalState = {
	isVisible: false,
	title: null,
	description: null,
	content: null,
};
export const GameEditionProvider = (props) => {
	const [gameEditionView, setGameEditionView] = useState(false);
	const [modalState, setModalState] = useState(initialModalState);

	const openModal = (settings) => {
		setModalState((prev) => ({ ...prev, ...settings, open: true }));
	};

	const closeModal = () => {
		setModalState(initialModalState);
	};

	return (
		<GameEditionContext.Provider
			value={{
				gameEditionView,
				setGameEditionView,
				modalState,
				setModalState,
				openModal,
				closeModal,
			}}
		>
			{props.children}
		</GameEditionContext.Provider>
	);
};
