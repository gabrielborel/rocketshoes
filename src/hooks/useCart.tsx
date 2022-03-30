import { createContext, ReactNode, useContext, useState } from "react";
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
  const [cart, setCart] = useState<Product[]>(
    () => JSON.parse(localStorage.getItem("@RocketShoes:cart") as string) || []
  );

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const { data: productStock } = await api.get<Stock>(
        `/stock/${productId}`
      );
      const productExists = updatedCart.find(
        (cartProduct) => cartProduct.id === productId
      );

      const productAmount = productExists ? productExists.amount : 0;
      const newProductAmount = productAmount + 1;

      if (newProductAmount > productStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExists) {
        productExists.amount = newProductAmount;
      } else {
        const { data: product } = await api.get<Product>(
          `/products/${productId}`
        );

        const newProduct = { ...product, amount: 1 };
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const previousCart = [...cart];
      const productExists = previousCart.find(
        (cartProduct) => cartProduct.id === productId
      );

      if (!productExists) {
        toast.error("Erro na remoção do produto");
        return;
      }

      const updatedCart = previousCart.filter(
        (cartProduct) => cartProduct.id !== productId
      );

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (!amount) throw new Error();

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      const previousCart = [...cart];

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = previousCart.map((cartProduct) =>
        cartProduct.id === productId
          ? { ...cartProduct, amount: amount }
          : { ...cartProduct }
      );

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
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
