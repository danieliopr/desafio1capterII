import { createContext, ReactNode, useContext, useState } from 'react';
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

type ProductSelected = Omit<Product, 'amount'>;

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => Promise<void>;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
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

  const addProduct = async (productId: number) => {
    try {
      const cartAux = [...cart];
      const productCart = cartAux.find(item => item.id === productId);

      // Busco o estoque do produto
      const stock: Stock = await api.get('stock/' + productId)
        .then(response => response.data);

      const currentAmount = productCart ? productCart.amount : 0;
      const amount = currentAmount + 1;

      // Verifico se tem estoque, e caso não tenho, não executo o resto do código
      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productCart) {
        productCart.amount = amount;
      } else {
        // Busco as informações do produto
        const product: ProductSelected = await api.get('products/' + productId)
          .then(response => response.data);

        const newProduct = {
          ...product,
          amount: 1
        };

        cartAux.push(newProduct);
      }

      setCart(cartAux);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartAux));

      // // Atualizo o estoque no banco de dados
      // await api.put('stock/' + productId, {id:productId, amount: stock.amount - 1});
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const cartAux = [...cart];

      // Busco a quantidade de item que tinha deste produto
      const productIndex = cart.findIndex(item => item.id === productId);

      if (productIndex != -1) {
        cartAux.splice(productIndex, 1);
        // Salvo o carrinho
        setCart(cartAux);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartAux));
      } else {
        throw Error();
      }


      // // Busco o estoque do produto
      // const stock: Stock = await api.get('stock/' + productId)
      //   .then(response => response.data);

      // // Atualizo o banco de dados
      // await api.put('stock/' + productId, {id:productId, amount: productAmount + stock.amount});

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

      // Busco o estoque do produto
      const stock: Stock = await api.get('stock/' + productId)
        .then(response => response.data);
      
      // Verifico se tem estoque, e caso não tenho, não executo o resto do código
      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(item =>
        item.id === productId
          ? { ...item, amount }
          : item
      );

      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      // // Atualizo o estoque no banco de dados
      // await api.put('stock/' + productId, { id: productId, amount: stock.amount - amount });

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
