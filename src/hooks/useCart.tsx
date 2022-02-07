import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [stock, setStock] = useState<Stock[]>([]);

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    const getStockProducts = async () => {
      try {
        const { data } = await api.get("stock");
        setStock(data);
        console.log("stock:", data);
      } catch {}
    };
    getStockProducts();
  }, []);

  const handleUpdateLocalStorageCart = (newCart: Product[]) => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
  };

  // useEffect(() => handleUpdateLocalStorageCart(cart), [cart]);

  const addProduct = async (productId: number) => {
    const productInStock = stock.find((product) => product.id === productId);
    const productInCart = cart.find((product) => product.id === productId);

    try {
      if (productInCart) {
        if (!productInStock || productInStock.amount <= productInCart.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
        const newCart = cart.map((product) =>
          product.id === productId
            ? { ...product, amount: product.amount + 1 }
            : product
        );
        setCart(newCart);
        handleUpdateLocalStorageCart(newCart);
      } else {
        const { data: newProduct } = await api.get(`/products/${productId}`);
        const newCart = [...cart, { ...newProduct, amount: 1 }];
        setCart(newCart);
        handleUpdateLocalStorageCart(newCart);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.find((product) => productId === product.id)) {
        throw new Error("Elemento não está no carrinho ");
      }
      const newCart = cart.filter((product) => product.id !== productId);
      setCart(newCart);
      handleUpdateLocalStorageCart(newCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;
      const productInStock = stock.find((product) => product.id === productId);
      const updatedCart = [...cart];
      const productInCart = updatedCart.find(
        (product) => product.id === productId
      );

      if (!productInStock || productInStock.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      if (productInCart) {
        productInCart.amount = amount;

        setCart(updatedCart);
        handleUpdateLocalStorageCart(updatedCart);
      } else {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
