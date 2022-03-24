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
  removeProduct: (productId: number) => void;
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
      console.log('addProduct')

      // Busco as informações do produto
      const product: ProductSelected = await api.get('Products/' + productId)
        .then(response => response.data);

      // Busco o estoque do produto
      const stock: Stock = await api.get('Stock/' + productId)
        .then(response => response.data);
      
      console.log(cart)

      // Verifico se tem estoque, e caso não tenho, não executo o resto do código
      if(stock.amount < 1){
        toast.error('Não temos mais estoque para este produto');
        return;
      }

      // Variável que vai indicar se existe o produdo no carrinho
      const productCart = cart.find(item =>item.id === productId);

      if(productCart !== undefined){
        console.log("Produto já no carrinho");
        const newCart = cart.map(item => 
          item.id === productId 
            ? {...item, amount: item.amount + 1}
            : item
        );
          
        setCart(newCart);
      }
      else 
      {
        // Crio objeto do novo produto
        const newProductStock:Product = {
          amount: 1,
          id: product.id,
          image: product.image,
          price: product.price,
          title: product.title
        }
        console.log("Produto novo no carrinho: ", newProductStock);
        
        setCart(cart =>[
          ...cart,
          newProductStock
        ])
      }
      console.log("Nova versao: ", cart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));

      // Atualizo o estoque no banco de dados
      updateProductAmount({
        productId: stock.id,
        amount: stock.amount - 1
      });
        
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // TODO
      console.log("Removendo produto do carrinho");

      // Busco todos os item do carrinho, menos o id do produto removido
      const newCart = cart.filter(item => item.id !== productId);

      console.log(newCart);
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
      await api.put('Stock/' + productId, { amount});
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
