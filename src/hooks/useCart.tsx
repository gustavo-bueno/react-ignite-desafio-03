import { useRef } from 'react';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({
    productId,
    amount,
  }: UpdateProductAmount) => Promise<void>;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const previousCartRef = useRef<Product[]>();

  useEffect(() => {
    previousCartRef.current = cart;
  });

  const previousCartValue = previousCartRef.current ?? cart;

  useEffect(() => {
    if (previousCartValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find((product) => product.id === productId);

      if (productExists) {
        const stock = await api.get(`/stock/${productId}`);

        if (productExists.amount + 1 > stock.data.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        productExists.amount += 1;

        setCart((currentCart) => {
          const list = currentCart.filter(
            (product) => product.id !== productId
          );
          const cartProducts = [...list, productExists];
          return cartProducts;
        });
      } else {
        const product = await api.get(`/products/${productId}`);

        setCart((currentCart) => {
          const cartProducts = [...currentCart, { ...product.data, amount: 1 }];
          localStorage.setItem(
            '@RocketShoes:cart',
            JSON.stringify(cartProducts)
          );
          return cartProducts;
        });
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartList = [...cart];
      const product = cartList.find((product) => product.id === productId);
      if (product) {
        const newList = cart.filter((product) => product.id !== productId);
        setCart(newList);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) {
      return;
    }
    try {
      const product = cart.find((product) => product.id === productId);
      if (product) {
        const stock = await api.get(`/stock/${productId}`);

        if (amount > stock.data.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        product.amount = amount;

        setCart((currentCart) => {
          const list = currentCart.filter(
            (product) => product.id !== productId
          );
          const cartProducts = [...list, product!];

          return cartProducts;
        });
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
