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
      const productCart = cart.find(item =>item.id === productId);

      if(productCart !== undefined){
        updateProductAmount({productId, amount: 1});
        return;
      }

      // Busco as informações do produto
      const product: ProductSelected = await api.get('Products/' + productId)
        .then(response => response.data);

      // Busco o estoque do produto
      const stock: Stock = await api.get('Stock/' + productId)
        .then(response => response.data);
      
      console.log(cart)

      // Verifico se tem estoque, e caso não tenho, não executo o resto do código
      if(stock.amount < 1){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newProductStock:Product = {
        id: product.id,
        amount: 1,
        image: product.image,
        price: product.price,
        title: product.title
      }
      console.log("Produto novo no carrinho: ", newProductStock);

      const newCart = [
        ...cart,
        newProductStock
      ];
      console.log("Nova versao: ", newCart);

      setCart(newCart);
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      // Atualizo o estoque no banco de dados
      await api.put('Stock/' + productId, {id:productId, amount: stock.amount - 1});
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      console.log("Removendo produto do carrinho");

      // Busco a quantidade de item que tinha deste produto
      const productAmount = cart.find(item => item.id === productId)?.amount || 0;

      // Busco todos os item do carrinho, menos o id do produto removido
      const newCart = cart.filter(item => item.id !== productId);
      console.log(newCart);
            
      // Salvo o carrinho
      setCart(newCart);

      // Busco o estoque do produto
      const stock: Stock = await api.get('Stock/' + productId)
        .then(response => response.data);

      // Atualizo o banco de dados
      await api.put('Stock/' + productId, {id:productId, amount: productAmount + stock.amount});

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      console.log('atualizando estoque');
      
      // Busco o estoque do produto
      const stock: Stock = await api.get('Stock/' + productId)
        .then(response => response.data);
      
      console.log(cart)

      // Verifico se tem estoque, e caso não tenho, não executo o resto do código
      if(stock.amount < amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(item => 
        item.id === productId 
          ? {...item, amount: item.amount + amount}
          : item
      );
        
      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      // Atualizo o estoque no banco de dados
      await api.put('Stock/' + productId, {id:productId, amount: stock.amount - amount });
      
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
