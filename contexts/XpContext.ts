import React from 'react';

interface IXpContext {
    showXpToast: (amount: number) => void;
}

export const XpContext = React.createContext<IXpContext>({
    showXpToast: () => {},
});
